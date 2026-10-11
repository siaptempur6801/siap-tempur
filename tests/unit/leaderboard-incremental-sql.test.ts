import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { expectSql, normalizeSql } from './helpers/sql-contract'
/**
 * Regresi: papan peringkat dihitung ulang secara INKREMENTAL.
 *
 * Sebelum perbaikan, `recalculate_leaderboard` menghapus SELURUH baris papan
 * lalu menulis ulang semuanya setiap kali satu peserta menyelesaikan ujian.
 * Untuk N peserta itu berarti O(N^2) penulisan baris dalam satu gelombang
 * submit. Padahal satu submission hanya dapat mengubah baris milik peserta itu
 * sendiri.
 *
 * Migration `20260918140000_leaderboard_incremental_recalculation.sql`:
 *   - `recalculate_leaderboard(board, user_id)` — hanya menghitung ulang satu
 *     user, dan tidak lagi mengosongkan papan.
 *   - `rebuild_leaderboard(board)` — hitung ulang penuh (delete + insert), untuk
 *     perubahan konfigurasi papan / perbaikan skor historis.
 *
 * Catatan kejujuran soal besaran: perbaikan ini TIDAK menghilangkan biaya O(N)
 * perbaikan peringkat — peserta yang masuk di puncak memang menggeser peringkat
 * semua orang di bawahnya. Yang hilang adalah DELETE massal + INSERT ulang.
 * Terukur di staging pada kasus terburuk (papan 52 baris, pendatang berperingkat
 * teratas sehingga seluruh peringkat bergeser): 104 operasi baris menjadi 54
 * (~2x), bukan satu orde besaran. Keuntungan strukturalnya: papan tidak pernah
 * kosong/separuh terisi saat dibaca, dan churn DELETE+INSERT (beban autovacuum)
 * hilang.
 *
 * Kesetaraan hasil kedua jalur TIDAK diuji di sini (itu butuh database); sudah
 * diverifikasi langsung ke staging: 8 asersi presisi + perbandingan
 * "inkremental identik dengan rebuild" = 0 selisih. Test ini mengunci kontrak
 * yang dapat diperiksa tanpa database.
 */

const migrationSql = readFileSync(
  resolve(
    __dirname,
    '../../supabase/migrations/20260918140000_leaderboard_incremental_recalculation.sql',
  ),
  'utf8',
)

const serviceSql = readFileSync(
  resolve(__dirname, '../../src/services/leaderboard.service.ts'),
  'utf8',
)

describe('leaderboard incremental — kontrak SQL', () => {
  it('menambahkan parameter user sehingga hanya satu user yang dihitung ulang', () => {
    expectSql(migrationSql).toContain('create or replace function public.recalculate_leaderboard(')
    expectSql(migrationSql).toContain('p_user_id uuid default null')
    // Filter per user adalah inti perbaikan ini.
    expectSql(migrationSql).toContain('and (p_user_id is null or ea.user_id = p_user_id)')
  })

  it('tidak lagi menghapus seluruh papan di jalur hitung-ulang per user', () => {
    // DELETE massal hanya boleh ada di rebuild_leaderboard.
    const normalizedSql = normalizeSql(migrationSql)
    const rebuildIndex = normalizedSql.indexOf('createorreplacefunctionpublic.rebuild_leaderboard')
    expect(rebuildIndex).toBeGreaterThan(-1)
    const incrementalPart = normalizedSql.slice(0, rebuildIndex)
    expectSql(incrementalPart).not.toContain(
      'delete from public.leaderboard_entries\n    where leaderboard_id = p_leaderboard_id;',
    )
  })

  it('hanya menulis peringkat yang benar-benar berubah', () => {
    expectSql(migrationSql).toContain('and le.rank is distinct from r.rank_pos')
  })

  it('memakai urutan peringkat yang sama seperti sebelumnya', () => {
    // Skor desc, durasi asc, submitted_at asc (NULL terakhir), user_id.
    expectSql(migrationSql).toContain('le.score desc')
    expectSql(migrationSql).toContain("(le.metadata ->> 'durationSeconds')::integer asc")
    expectSql(migrationSql).toContain("(le.metadata ->> 'submittedAt')::timestamptz asc nulls last")
    expectSql(migrationSql).toContain('le.user_id asc')
  })

  it('mempertahankan ambang durasi yang sama dengan versi sebelumnya', () => {
    // 2147483647 — bukan 0 dan bukan largeint, supaya baris tanpa durasi
    // tetap berada di urutan yang sama.
    expectSql(migrationSql).toContain('2147483647')
  })

  it('menyediakan rebuild penuh terpisah untuk perubahan konfigurasi papan', () => {
    expectSql(migrationSql).toContain(
      'create or replace function public.rebuild_leaderboard(p_leaderboard_id uuid)',
    )
    expectSql(migrationSql).toContain('delete from public.leaderboard_entries')
  })

  it('membuang overload satu-argumen yang menyebabkan PGRST203', () => {
    expectSql(migrationSql).toContain(
      'drop function if exists public.recalculate_leaderboard(uuid);',
    )
  })

  it('memisahkan penulisan baris dan perbaikan peringkat menjadi dua pernyataan', () => {
    // Regresi bug nyata: semula keduanya digabung dalam SATU pernyataan
    // (INSERT ... ; WITH ranked AS (...) UPDATE ...). Semua CTE dalam satu
    // pernyataan berbagi snapshot yang sama, dan CTE yang menulis tidak
    // terlihat oleh pembacaan tabel yang sama — sehingga baris yang baru
    // di-insert TIDAK ikut terhitung saat peringkat dihitung ulang dan
    // tertinggal di peringkat sementara (rank = 0).
    //
    // Terbukti di staging: pendatang baru dengan skor tertinggi muncul
    // sebagai rank 0, bukan rank 1.
    //
    // Kontraknya: INSERT dan UPDATE peringkat harus dipisah titik koma.
    const normalizedSql = normalizeSql(migrationSql)
    const insertIdx = normalizedSql.indexOf('insertintopublic.leaderboard_entriesasle')
    const rankUpdateIdx = normalizedSql.indexOf('updatepublic.leaderboard_entriesle')
    expect(insertIdx).toBeGreaterThan(-1)
    expect(rankUpdateIdx).toBeGreaterThan(insertIdx)

    const between = normalizedSql.slice(insertIdx, rankUpdateIdx)
    // Harus ada `end if;` (blok DELETE kondisional) yang menutup pernyataan
    // INSERT sebelum UPDATE dimulai.
    expectSql(between).toContain('end if;')
    expectSql(between).toContain('delete from public.leaderboard_entries le')
  })

  it('memakai peringkat sementara yang pasti ikut diperbaiki', () => {
    // Peringkat sementara harus nilai yang tidak mungkin sama dengan
    // peringkat sah mana pun (1..n), sehingga baris baru selalu tersentuh
    // oleh `rank is distinct from rank_pos`.
    expectSql(migrationSql).toContain('0,\n        i.metadata,')
  })

  it('membuang baris user yang tidak lagi memenuhi syarat', () => {
    expectSql(migrationSql).toContain('and not exists (')
    expectSql(migrationSql).toContain('from jsonb_array_elements(v_ranked) as entry')
  })

  it('mengeraskan search_path dan membatasi EXECUTE ke service_role', () => {
    // Hanya pernyataan DDL yang dihitung (`set search_path` di awal baris),
    // supaya komentar yang menyebut search_path lama tidak ikut terbaca.
    expect(
      normalizeSql(migrationSql).match(/setsearch_path(?:=|to)''/g)?.length,
    ).toBeGreaterThanOrEqual(2)
    expectSql(migrationSql).toContain(
      'revoke all on function public.recalculate_leaderboard(uuid, uuid) from authenticated;',
    )
    expectSql(migrationSql).toContain(
      'revoke all on function public.recalculate_leaderboard(uuid, uuid) from anon;',
    )
    expectSql(migrationSql).toContain(
      'grant execute on function public.recalculate_leaderboard(uuid, uuid) to service_role;',
    )
    expectSql(migrationSql).toContain(
      'revoke all on function public.rebuild_leaderboard(uuid) from authenticated;',
    )
    expectSql(migrationSql).toContain(
      'grant execute on function public.rebuild_leaderboard(uuid) to service_role;',
    )
    // Overload lama dipakai dengan search_path yang dapat berubah — tidak
    // boleh ada pernyataan DDL yang masih menetapkannya.
    expectSql(migrationSql).not.toMatch(/set\s+search_path\s+(?:=|to).*pg_temp/i)
  })
})

describe('leaderboard incremental — pemanggil', () => {
  it('mengirim p_user_id di jalur submit, bukan hanya id papan', () => {
    // Tanpa ini seluruh perbaikan tidak aktif: fungsi akan default ke
    // sinkronisasi penuh dan kembali menulis ulang seluruh papan.
    expect(serviceSql).toContain('p_leaderboard_id: String(board.id)')
    expect(serviceSql).toContain('p_user_id: userId')
  })
})
