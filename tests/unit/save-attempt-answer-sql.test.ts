import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { expectSql } from './helpers/sql-contract'
/**
 * Regresi: simpan jawaban ujian dalam satu round trip.
 *
 * Sebelumnya setiap klik jawaban menembus jaringan lima kali secara berurutan
 * (attempt → soal → opsi → upsert jawaban → touch attempt), ditambah
 * `auth.getUser()` di server action. Pada latensi round trip Supabase yang
 * terukur ~220 ms, itu ~1,3 detik per klik — sementara peserta dapat berpindah
 * soal jauh lebih cepat. Full Tryout CPNS berisi 110 soal.
 *
 * Migration `20260918150000_save_attempt_answer_single_round_trip.sql`
 * memindahkan seluruh validasi + penulisan ke satu fungsi.
 *
 * Yang diuji di sini adalah kontrak yang dapat diperiksa tanpa database.
 * Perilaku fungsionalnya sudah diverifikasi langsung ke staging — 13 kasus,
 * termasuk bahwa opsi milik soal lain DITOLAK, user lain DITOLAK, deadline
 * ditegakkan, dan pemilihan ulang opsi tidak menghasilkan baris ganda.
 */

const migrationSql = readFileSync(
  resolve(
    __dirname,
    '../../supabase/migrations/20260918150000_save_attempt_answer_single_round_trip.sql',
  ),
  'utf8',
)

const serviceSql = readFileSync(
  resolve(__dirname, '../../src/services/attempt-answer.service.ts'),
  'utf8',
)
const repositorySql = readFileSync(
  resolve(__dirname, '../../src/repositories/attempt.repository.ts'),
  'utf8',
)

describe('save_attempt_answer_for_user — kontrak SQL', () => {
  it('menjalankan validasi kepemilikan attempt di database', () => {
    expectSql(migrationSql).toContain(
      'create or replace function public.save_attempt_answer_for_user(',
    )
    expectSql(migrationSql).toContain('and ea.user_id = p_user_id')
    expectSql(migrationSql).toContain("and lower(ea.status) in ('in_progress', 'created')")
  })

  it('menegakkan deadline ujian di server, bukan hanya di browser', () => {
    expectSql(migrationSql).toContain('c_grace_seconds constant integer := 30')
    expectSql(migrationSql).toContain('make_interval(secs => v_duration_seconds + c_grace_seconds)')
    expectSql(migrationSql).toContain('[ATTEMPT_TIME_EXPIRED]')
    // Attempt tanpa durasi (drill/latihan bebas) tidak dibatasi.
    expectSql(migrationSql).toContain('if v_duration_seconds is not null')
  })

  it('menolak opsi yang bukan milik soal — anti-manipulasi skor', () => {
    expectSql(migrationSql).toContain('from public.question_options qo')
    expectSql(migrationSql).toContain('where qo.question_id = p_question_id')
    expectSql(migrationSql).toContain('and qo.id = any(v_selected)')
    expectSql(migrationSql).toContain('if v_valid_count <> v_requested_count then')
  })

  it('hanya menyentuh kolom yang memang boleh berubah', () => {
    // `is_correct` dan `score_awarded` diisi saat scoring, bukan saat simpan.
    expectSql(migrationSql).toContain('on conflict (attempt_question_id) do update')
    expectSql(migrationSql).toContain(
      'attempt_question_id, selected_option_id, answer_value, answered_at, updated_at',
    )
    expectSql(migrationSql).not.toMatch(/set[\s\S]{0,120}is_correct\s*=/)
    expectSql(migrationSql).not.toMatch(/set[\s\S]{0,120}score_awarded\s*=/)
  })

  it('menandai attempt tersentuh pada posisi soal terakhir', () => {
    expectSql(migrationSql).toContain('last_question_position = v_position')
    expectSql(migrationSql).toContain('last_saved_at          = now()')
  })

  it('menulis opsi pilihan ganda secara idempoten', () => {
    expectSql(migrationSql).toContain(
      'insert into public.attempt_answer_options (attempt_answer_id, option_id)',
    )
    expectSql(migrationSql).toContain('on conflict (attempt_answer_id, option_id) do nothing')
  })

  it('mengeraskan search_path dan membatasi EXECUTE ke service_role', () => {
    expectSql(migrationSql).toMatch(/set\s+search_path\s+(?:=|to)\s+''/i)
    expectSql(migrationSql).toContain(
      'revoke all on function public.save_attempt_answer_for_user(uuid, uuid, uuid, uuid[]) from anon;',
    )
    expectSql(migrationSql).toContain(
      'revoke all on function public.save_attempt_answer_for_user(uuid, uuid, uuid, uuid[]) from authenticated;',
    )
    expectSql(migrationSql).toContain(
      'grant execute on function public.save_attempt_answer_for_user(uuid, uuid, uuid, uuid[]) to service_role;',
    )
    expectSql(migrationSql).not.toMatch(/set\s+search_path\s+(?:=|to).*pg_temp/i)
  })

  it('tidak pernah membaca atau mengembalikan kunci jawaban', () => {
    // Diperiksa pada SQL saja — komentar migration memang menyebut kolom
    // `is_correct`/`score_awarded` untuk menjelaskan bahwa keduanya TIDAK
    // disentuh, dan itu bukan pelanggaran.
    const sqlOnly = migrationSql
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n')

    expectSql(sqlOnly).not.toContain('is_correct')
    expectSql(sqlOnly).not.toContain('explanation')
  })
})

describe('jalur simpan jawaban — kontrak pemanggil', () => {
  it('service mencoba RPC lebih dulu, bukan jalur lima panggilan', () => {
    expect(serviceSql).toContain('attemptRepository.saveAttemptAnswer(')
    // Dedup wajib dilakukan SEBELUM dikirim, supaya klien yang mengirim opsi
    // duplikat tidak ditolak oleh pemeriksaan jumlah di database.
    expect(serviceSql).toContain('Array.from(new Set(input.optionIds.filter(Boolean)))')
  })

  it('tetap punya fallback ke jalur lama selama masa transisi migration', () => {
    // Menyimpan jawaban peserta tidak boleh gagal hanya karena urutan deploy.
    expect(serviceSql).toContain('saveAnswerLegacy')
    expect(serviceSql).toContain('saveAnswerOptionsLegacy')
    expect(repositorySql).toContain(
      "if (error.code === 'PGRST202') return { status: 'unavailable' }",
    )
  })

  it('memetakan kode error RPC lewat daftar putih, bukan meneruskan mentah', () => {
    expect(repositorySql).toContain(
      'const match = /^\\[([A-Z_]+)\\]\\s*([\\s\\S]*)$/.exec(error.message',
    )
    expect(serviceSql).toContain('isPracticeErrorCode(result.code)')
  })
})
