# CPNS Production Content Readiness — 2026-10-07

## Keputusan dan batas scope

**Status: OWNER POLICY APPROVED; CANDIDATE MANIFESTS v1 DIBUAT, BELUM DISETUJUI UNTUK ASSESSMENT.** CPNS Pass dan token tetap `ARCHIVED` untuk pembelian baru. Tiga assessment `[Legacy History]` tetap DRAFT dan tidak dipakai. Audit ini read-only terhadap production: tidak ada produk, assessment, soal, versi soal, atau entitlement yang diubah.

Blueprint section 30/35/45 dan distribusi kategori di bawah diambil dari migrasi repository [`202402230001_rework_tryout_rpc.sql`](../supabase/migrations/202402230001_rework_tryout_rpc.sql), yang menyebut komposisi itu sebagai official SKD CPNS blueprint. Migrasi tersebut memakai schema lama dan `ORDER BY random()`; yang dipakai sebagai kontrak di sini hanya kuota kategori, bukan cara memilih soal atau implementasi runtime lamanya. Angka total, durasi, dan passing score Full/Mini memakai assessment staging yang sudah lulus QA.

Kuota kategori hasil pemetaan migration 2024 ke taxonomy CPNS production telah disetujui owner. Candidate manifest v1 sudah dibuat, tetapi reviewer konten masih harus mengesahkan setiap ID, memeriksa taxonomy dan mutu soal, serta menyelesaikan asset dependency. Sampai review tersebut disetujui, assessment kanonik tetap **NOT CREATED** dan tidak ada question ID yang dipasang ke production assessment.

## Kontrak assessment yang diusulkan

| Jenis | Assessment kanonik | Komposisi | Durasi | Passing score staging |
|---|---|---|---:|---|
| Full Tryout | `CPNS_FULL_01` | TWK 30 + TIU 35 + TKP 45 = **110** | 6.000 detik | TWK 65, TIU 80, TKP 166 |
| Mini Tryout | `CPNS_MINI_TWK_01` | TWK 30 | 1.800 detik | TWK 65 |
| Mini Tryout | `CPNS_MINI_TIU_01` | TIU 35 | 2.100 detik | TIU 80 |
| Mini Tryout | `CPNS_MINI_TKP_01` | TKP 45 | 2.700 detik | TKP 166 |
| Drill | satu konfigurasi per materi yang ditawarkan | 30 soal dari materi dan turunannya | 1.800 detik | sesuai section: 65 / 80 / 166 |

Mini Tryout menggunakan jumlah, durasi, dan passing score staging yang tervalidasi. Distribusi kategorinya mengikuti kuota Full untuk section yang sama; ini menghindari penciptaan blueprint Mini baru. Setelah mengecualikan dua soal TIU yang belum layak karena aset visual hilang, overlap minimum Full/Mini menjadi 7 soal bila bank tidak bertambah: satu Analogi Figural, dua Jejaring Kerja, dan empat Anti Radikalisme. Overlap harus dicatat pada dua manifest.

## Blueprint Full Tryout — komposisi per taxonomy

Kuota diambil dari migration repository, bukan hasil difficulty sampling. `Selected` adalah jumlah slot dalam satu assessment; belum ada soal yang dipilih.

| Section | Material / submaterial | Published usable | Required | Selected | % section |
|---|---|---:|---:|---:|---:|
| TWK | Nasionalisme | 43 | 30 section | 6 | 20,0% |
| TWK | Integritas | 37 | 30 section | 6 | 20,0% |
| TWK | Bela Negara | 41 | 30 section | 6 | 20,0% |
| TWK | Pilar Negara (gabungan turunannya) | 72 | 30 section | 6 | 20,0% |
| TWK | Bahasa Negara | 44 | 30 section | 6 | 20,0% |
| **TWK total** |  | **237** | **30** | **30** | **100%** |
| TIU | Kemampuan Verbal — Analogi | 11 | 35 section | 3 | 8,6% |
| TIU | Kemampuan Verbal — Silogisme | 13 | 35 section | 3 | 8,6% |
| TIU | Kemampuan Verbal — Analitis | 15 | 35 section | 4 | 11,4% |
| TIU | Kemampuan Numerik — Berhitung | 11 | 35 section | 5 | 14,3% |
| TIU | Kemampuan Numerik — Deret Angka | 12 | 35 section | 5 | 14,3% |
| TIU | Kemampuan Numerik — Perbandingan Kuantitatif | 12 | 35 section | 5 | 14,3% |
| TIU | Kemampuan Numerik — Soal Cerita | 22 | 35 section | 5 | 14,3% |
| TIU | Kemampuan Figural — Analogi Figural | 4 | 35 section | 2 | 5,7% |
| TIU | Kemampuan Figural — Ketidaksamaan | 5 | 35 section | 1 | 2,9% |
| TIU | Kemampuan Figural — Serial | 8 | 35 section | 2 | 5,7% |
| **TIU total** |  | **113** | **35** | **35** | **100%** |
| TKP | Pelayanan Publik | 22 | 45 section | 8 | 17,8% |
| TKP | Jejaring Kerja | 14 | 45 section | 8 | 17,8% |
| TKP | Sosial Budaya | 21 | 45 section | 7 | 15,6% |
| TKP | Teknologi Informasi dan Komunikasi | 20 | 45 section | 7 | 15,6% |
| TKP | Profesionalisme | 24 | 45 section | 7 | 15,6% |
| TKP | Anti Radikalisme | 12 | 45 section | 8 | 17,8% |
| **TKP total** |  | **113** | **45** | **45** | **100%** |

Untuk TWK, migration lama menetapkan 6 slot pada Pilar Negara di tingkat material. Taxonomy produksi membagi Pilar menjadi Pancasila (32), UUD RI 1945 (33), NKRI (1), dan Bhinneka Tunggal Ika (6). Belum ada kuota resmi per submaterial; keenam slot harus dipetakan dan diperiksa reviewer terhadap bank aktual, tanpa mengarang pembagian baru.

## Audit taxonomy production

Jumlah berikut menghitung soal `published`, mempunyai snapshot versi aktif, dan primary mapping pada node. Baris material induk mencakup turunannya dan **tidak dijumlahkan kembali** dengan baris submaterial.

| Section | Material | Submaterial | Published usable |
|---|---|---|---:|
| TWK | Nasionalisme | — | 43 |
| TWK | Integritas | — | 37 |
| TWK | Bela Negara | — | 41 |
| TWK | Pilar Negara | total turunan | 72 |
| TWK | ↳ Pilar Negara | Pancasila | 32 |
| TWK | ↳ Pilar Negara | UUD RI 1945 | 33 |
| TWK | ↳ Pilar Negara | Negara Kesatuan Republik Indonesia | 1 |
| TWK | ↳ Pilar Negara | Bhinneka Tunggal Ika | 6 |
| TWK | Bahasa Negara | — | 44 |
| **TWK total** |  |  | **237** |
| TIU | Kemampuan Verbal | total submaterial | 39 |
| TIU | ↳ Kemampuan Verbal | Analogi | 11 |
| TIU | ↳ Kemampuan Verbal | Silogisme | 13 |
| TIU | ↳ Kemampuan Verbal | Analitis | 15 |
| TIU | Kemampuan Numerik | total submaterial | 57 |
| TIU | ↳ Kemampuan Numerik | Berhitung | 11 |
| TIU | ↳ Kemampuan Numerik | Deret Angka | 12 |
| TIU | ↳ Kemampuan Numerik | Perbandingan Kuantitatif | 12 |
| TIU | ↳ Kemampuan Numerik | Soal Cerita | 22 |
| TIU | Kemampuan Figural | total submaterial | 17 |
| TIU | ↳ Kemampuan Figural | Analogi Figural | 4 |
| TIU | ↳ Kemampuan Figural | Ketidaksamaan | 5 |
| TIU | ↳ Kemampuan Figural | Serial | 8 |
| **TIU total** |  |  | **113** |
| TKP | Pelayanan Publik | — | 22 |
| TKP | Jejaring Kerja | — | 14 |
| TKP | Sosial Budaya | — | 21 |
| TKP | Teknologi Informasi dan Komunikasi | — | 20 |
| TKP | Profesionalisme | — | 24 |
| TKP | Anti Radikalisme | — | 12 |
| **TKP total** |  |  | **113** |

### Metadata dan pemeriksaan konten awal

- Pool usable berisi 463 soal: TWK 237, TIU 113, TKP 113. Terdapat satu soal DRAFT pada TWK dan satu pada TIU; keduanya tidak masuk pool published/current-version.
- Semua 463 soal usable berjenis `single_choice`, mempunyai snapshot aktif, stem tidak kosong, minimal dua opsi, dan opsi bernilai untuk scoring.
- Difficulty semuanya `unclassified`; cognitive level belum diisi; tidak ada pertanyaan terkait stimulus.
- Pemeriksaan stem yang dinormalisasi menemukan **satu pasangan prompt TIU yang sama**. Keduanya sudah ditinjau read-only; rinciannya ada di bagian “Review pasangan TIU”.
- Audit struktur tidak membuktikan ketepatan jawaban, kejelasan opsi, kemutakhiran sumber, atau validitas pedagogis. Semua soal dalam manifest tetap perlu content QA manusia. Tidak ada answer key yang dibaca atau dicantumkan dalam report ini.

## Drill — cakupan materi dan kesiapan parsial

Aturan aplikasi yang ada: satu Drill menggunakan satu active knowledge node dan seluruh descendant-nya, hanya soal eligible berprimary mapping, dan minimal 30 soal. Angka `Available` menghitung pool yang sesuai aturan Drill production; node induk dan turunannya overlap sehingga jumlah baris bukan jumlah soal unik lintas katalog.

| Section | Material / node yang dapat dipilih | Available | Offer bila partial launch disetujui? |
|---|---|---:|---|
| TWK | Nasionalisme | 43 | Ya |
| TWK | Integritas | 37 | Ya |
| TWK | Bela Negara | 41 | Ya |
| TWK | Pilar Negara | 72 | Ya; mencakup turunan |
| TWK | Bahasa Negara | 44 | Ya |
| TWK | Pancasila | 32 | Ya |
| TWK | UUD RI 1945 | 33 | Ya |
| TWK | Negara Kesatuan Republik Indonesia | 1 | Tidak |
| TWK | Bhinneka Tunggal Ika | 6 | Tidak |
| TIU | Kemampuan Verbal | 39 | Ya; mencakup turunan |
| TIU | Kemampuan Numerik | 57 | Ya; mencakup turunan |
| TIU | Kemampuan Figural | 17 | Tidak |
| TIU | Analogi / Silogisme / Analitis | 11 / 13 / 15 | Tidak sebagai node Drill terpisah |
| TIU | Berhitung / Deret / Perbandingan / Soal Cerita | 11 / 12 / 12 / 22 | Tidak sebagai node Drill terpisah |
| TIU | Analogi Figural / Ketidaksamaan / Serial | 4 / 5 / 8 | Tidak sebagai node Drill terpisah |
| TKP | Pelayanan Publik / Jejaring Kerja / Sosial Budaya | 22 / 14 / 21 | Tidak |
| TKP | TIK / Profesionalisme / Anti Radikalisme | 20 / 24 / 12 | Tidak |

Sebelum review, sembilan node memiliki pool mentah ≥30; setelah review, **7/28 node** memiliki 30 soal approved. Integritas dan Pancasila turun di bawah threshold. Hanya tujuh node yang boleh berstatus READY; dua node tersebut dan seluruh node lain berstatus unavailable. Ini bukan persetujuan untuk membuka produk.

## Scoring

Gunakan scoring configuration yang sudah lulus staging; jangan menghitung ulang dari persentase atau menyederhanakan TKP menjadi benar/salah.

| Section | Passing score | Kontrak scoring |
|---|---:|---|
| TWK | 65 | scorer existing CPNS untuk section TWK |
| TIU | 80 | scorer existing CPNS untuk section TIU |
| TKP | 166 | scorer existing CPNS berbasis nilai opsi TKP |

Nilai passing di atas mereferensikan kontrak staging yang tercatat. Sebelum pembuatan assessment DRAFT, cocokkan kembali `exam_rule`/section config staging; jangan menyalin ID staging ke production.

## Review pasangan TIU

| Question ID | Kode | Taxonomy | Published/version | Source | Review metadata | Manifest decision |
|---|---|---|---|---|---|---|
| `04348de8-072b-48e0-9406-66338c899f73` | `TIU-000080` | Analogi Figural | published / v1 | `legacy_migration` | editorial, academic, technical QA approved pada v1 | Exclude — visual asset hilang |
| `7865dbce-1b24-4836-ba7e-e0bbfb6e45b8` | `TIU-000081` | Serial | published / v1 | `legacy_migration` | editorial, academic, technical QA approved pada v1 | Exclude — visual asset hilang |

**Klasifikasi:** false positive untuk deteksi semantic duplicate berdasarkan stem saja. Prompt generik “Perhatikan gambar berikut!” dapat dipakai oleh soal gambar yang berbeda, dan taxonomy keduanya memang berbeda. Namun payload yang tersimpan tidak memiliki gambar pada stem, opsi, atau relasi stimulus; opsi hanya berupa label gambar. Maka maksud kedua soal tidak bisa diverifikasi dari production saat ini. Tidak ada dasar metadata untuk memilih satu sebagai canonical: kedua status, versi, sumber, dan tahap review sama. **Canonical question: NONE.** Keduanya dikecualikan dari candidate manifest sampai aset dipulihkan melalui alur konten resmi dan direview ulang. Tidak ada baris production yang diubah. Tidak ada answer key yang dibaca.

Scan exact normalized stem pada published pool menemukan hanya pasangan tersebut. Near-duplicate scan tidak dijalankan karena repository tidak memiliki tooling yang aman/reviewable untuk itu; tidak dipakai similarity threshold spekulatif.

## Question selection, versi, dan reuse

1. Saring hanya question yang published, approved sesuai aturan Drill bila relevan, mempunyai `question_versions` untuk `questions.version` aktif, serta lolos subject/track dan taxonomy yang telah disetujui.
2. Candidate ID v1 disusun memakai ordering stabil `published_at DESC, created_at ASC, id ASC`, setelah filter published/current-version/primary-taxonomy/valid option structure dan eksklusi yang dicatat. Ordering ini hanya membuat kandidat reproducible; ia bukan persetujuan kualitas. Reviewer harus mengesahkan atau mengganti setiap ID berdasarkan isi, taxonomy, opsi, sumber, dan kelengkapan aset. Kedua ID pada pasangan TIU di atas tidak eligible sampai aset gambar dipulihkan dan direview ulang.
3. Simpan manifest immutable dengan assessment code, blueprint revision, section/category, `question_id`, `question_version`, posisi, hasil content review, serta daftar overlap lintas assessment. Jangan masukkan jawaban/kunci ke manifest.
4. Canonical full/mini menggunakan `exam_question_items` berisi exact IDs dan frozen versions. Pakai urutan manifest (`question_order='sequence'`) bila kontrak engine tetap mendukungnya; sebelum setup, verifikasi resolver tidak mengubah membership atau urutan. Drill menyimpan pool eligible dengan revision/count dan tetap mengikuti pemilihan existing engine; jangan membangun randomizer baru.
5. Tidak boleh ada ID berulang dalam satu assessment. Reuse lintas Full/Mini/Drill dicatat; prioritaskan ID belum dipakai bila sesuai kuota dan lolos review. Dengan kuota section yang sama dan dua soal di atas dikecualikan, overlap minimum adalah 7: Analogi Figural (1), Jejaring Kerja (2), Anti Radikalisme (4). Owner telah menyetujui reuse terukur; kandidat sekarang overlap 8 setelah replacement item figural.

Manifest candidate v1 tersimpan sebagai TSV agar ID, versi, urutan, dan state review dapat divalidasi mesin:

```text
docs/content/cpns/full-tryout-01.tsv
docs/content/cpns/mini-twk-01.tsv
docs/content/cpns/mini-tiu-01.tsv
docs/content/cpns/mini-tkp-01.tsv
docs/content/cpns/drill-pools-v1.tsv
```

Manifest tersebut berisi selection eksplisit dan state review. Mini TWK/TKP serta tujuh pool Drill telah dibekukan secara independen; Full, Mini TIU, dan dua pool Drill belum memenuhi gate. Pembuatan assessment tetap menjadi task terpisah.

## Marketing dan product contract

Production products `CPNS_PASS_7/30/90/180` dan `CPNS_TOKEN_1/5/10` masih `ARCHIVED`; entitlement, orders, saldo dan harga lama tidak diubah. Deskripsi pass mencakup akses penuh/premium; feature grants mencakup Full Tryout, Mini Tryout, `cpns.drill.unlimited`, pembahasan, progress, rekomendasi, remedial, dan materi premium. Token products secara eksplisit menjanjikan Full Tryout.

Kode readiness saat ini memeriksa keberadaan jenis assessment: Pass membutuhkan TRYOUT + MINI_TRYOUT + DRILL; token membutuhkan TRYOUT. Pemeriksaan jenis tidak mengukur cakupan Drill. Karena katalog Drill saat ini baru 9 dari 28 node active yang tersedia, Pass tidak boleh dibuka hanya karena satu assessment DRILL aktif. Gate dan copy perlu menyatakan secara eksplisit apakah Pass menawarkan materi Drill yang tersedia atau mewajibkan semua materi.

Rekomendasi: **partial Drill boleh ditampilkan sebagai katalog konten gratis/terbatas dengan unavailable state yang jelas**; **CPNS Pass tetap HOLD** sampai owner menetapkan bahwa cakupan 9 node ini sesuai janji produk, copy diselaraskan, dan readiness gate memeriksa capability yang benar. Token pack baru dapat dipertimbangkan setelah Full Tryout lolos content/technical QA dan participant smoke. Tidak ada commerce yang dibuka dalam tahap blueprint ini.

| Produk | Janji/fitur tercatat | Minimum capability sebelum re-enable | Status |
|---|---|---|---|
| CPNS Token | Full Tryout CPNS | Full Tryout usable, scoring/resolver/session lulus, participant smoke PASS | ARCHIVED / HOLD |
| CPNS Pass | akses penuh/premium; Full, Mini, Drill unlimited dan fitur belajar lain | Full + 3 Mini + Drill sesuai cakupan yang disetujui, copy dan gate sejalan, QA participant PASS | ARCHIVED / HOLD |

## Readiness gate dan urutan kerja

Assessment baru dibuat terpisah dari legacy dengan status **DRAFT** hanya setelah owner-approved policy sudah diterapkan dan reviewer membekukan manifest. Jangan membuat DRAFT kosong hanya untuk memberi kesan siap.

1. Keputusan owner sudah tercatat: migration 2024 sebagai blueprint, Drill parsial 9 node, Pass menunggu semua 28 node, dan overlap Mini diperbolehkan.
2. Reviewer konten memeriksa semua kategori, pasangan stem TIU duplikat, opsi, pembahasan/sumber, ambiguitas, dan pilih exact ID+version ke manifest.
3. Siapkan Full Tryout kanonik `DRAFT`; validasi 110 item, 30/35/45, taxonomy, 6.000 detik, passing/scoring, tidak ada duplicate ID, dan resolver statis.
4. Uji Full di staging: discover, start, 110 soal, navigasi section, autosave, refresh/resume, timer, submit, scoring, result.
5. Siapkan Mini TWK/TIU/TKP sebagai DRAFT mengikuti manifest dan kontrak staging; jalankan katalog, jumlah, durasi, submit, result.
6. Siapkan hanya Drill yang disetujui dari node yang mencapai 30; uji start/autosave/refresh/resume/completion/progress.
7. Aktivasi production satu capability per langkah setelah QA dan participant smoke-nya lulus. Re-enable token/pass secara terpisah dengan exact product IDs setelah janji capability terpenuhi.

## Owner decisions — APPROVED

1. **Blueprint canonical V1:** kuota migration 2024 disetujui sebagai dasar; mapping tetap memakai taxonomy production.
2. **Reuse Mini:** overlap Full/Mini diperbolehkan dan wajib tercatat. Candidate manifests saat ini overlap 8 soal; ini satu lebih banyak dari minimum 7 karena item Analogi Figural tanpa aset diganti.
3. **Drill parsial:** katalog dapat menampilkan hanya 9 node yang memenuhi minimum 30; node lain unavailable.
4. **Cakupan Pass CPNS:** CPNS Pass wajib menunggu seluruh 28 node siap. Pass tetap archived/disabled untuk penjualan baru.
5. **Token:** produk token tetap archived sampai Full Tryout lulus review konten, technical QA, dan participant smoke.

## Current state

| Deliverable | Status |
|---|---|
| Full section contract (30/35/45, 110, 6.000 sec) | READY — staging validated |
| Full taxonomy/category quotas | OWNER APPROVED — migration 2024 |
| Mini counts/durations/scoring | READY — staging validated; category quotas inherit Full |
| Drill pool inventory | PARTIAL FREEZE — 7 ready nodes; Integritas (29) and Pancasila (26) unavailable |
| Exact duplicate review | COMPLETE — pair classified as stem-only false positive; both excluded due missing visuals |
| Full/Mini question IDs and versions | Mini TWK/TKP FROZEN V1; Full and Mini TIU HOLD |
| Canonical Full/Mini/Drill production assessment | Mini TWK and Mini TKP DRAFT CREATED; Full, Mini TIU NOT CREATED; Drill HOLD — see latest section below |
| Legacy `[Legacy History]` assessment rows | PRESERVED AS DRAFT |
| CPNS commerce | ARCHIVED / disabled for new sales |
| Production activation | NOT AUTHORIZED / NOT DONE |

## Content review and candidate manifests — 2026-10-07

Owner policy decisions above are complete. Candidate selection used fixed production question IDs and current question versions. This audit did not expose answer-key values; its database check returned only aggregate correctness-structure counts. The stable ordering is applied only inside each required taxonomy bucket. Candidate files contain the exact Full Tryout and Mini TWK/TIU/TKP sets at staging-validated counts, and nine candidate Drill pools of 30 IDs each. No production assessment or product was changed.

**Review gate: NOT APPROVED.** The current candidate rows are annotated from production `content_reviews` for the active question version and the asset audit. The audit found 342 `APPROVED`, 5 `BLOCKED_ASSET`, and 5 `NEEDS_REVIEW` unique selected questions. Approval reflects completed academic/editorial/technical QA records and structural checks; it does not override the unresolved environment asset dependency. Full/Mini TIU cannot be frozen while any required item is blocked or pending.

The preliminary content inspection found two candidates unsuitable to freeze. `TIU-000078` asks participants to choose an image, but the snapshot has no image asset and its options are only image labels; it was excluded and replaced in Full with same-bucket `TIU-000125`. `TIU-000095` has two identical option texts; it was excluded from every candidate set. Full replaces it with same-bucket `TIU-000013` (stable candidate rank 9); the TIU Verbal Drill pool replaces it with `TIU-000020` after filtering the invalid option set. Reuse is now 8 questions across Full/Mini. Five selected TIU questions (`TIU-000120/121/122/125/126`) reference image objects under the staging Supabase project; their manifest state is now `BLOCKED_ASSET` pending ownership/provenance and a production-safe, version-consistent asset path. The earlier pair `TIU-000080/081` remains excluded because its visual data is missing.

Full Tryout's six Pilar candidates currently map to Pancasila (2) and UUD 1945 (4). The 2024 migration defines only the six-item Pilar parent quota, not a submaterial quota. This observed split is recorded as a candidate outcome, not a new approved subquota; reviewers may replace items within Pilar while preserving the parent quota.

The Drill pool file initially contained 270 rows over 9 candidate partial-catalog nodes and 244 distinct question IDs. After item-level review, 7 nodes retain 30 approved unique questions; Integritas has 29 and Pancasila has 26, so those two nodes are unavailable. Parent/child pool overlap is expected; each individual pool still has 30 candidate IDs. The other 19 nodes remain unavailable. CPNS Pass remains archived until all 28 nodes are ready. Token products remain archived until Full Tryout review, technical QA, and participant smoke pass.

Initial candidate manifest checksums (historical, before review-state/freeze annotations) are SHA-256 over the exact TSV bytes:

| Manifest | Rows | SHA-256 |
|---|---:|---|
| [Full Tryout](content/cpns/full-tryout-01.tsv) | 110 | `2e0da64d14d76d246625ef23760dc16cba01f1be1bd80086fb349f01084a3d43` |
| [Mini TWK](content/cpns/mini-twk-01.tsv) | 30 | `702b30ad1c57c9f09bde8cbee21dad4885025dfda7e3768b950389d440462556` |
| [Mini TIU](content/cpns/mini-tiu-01.tsv) | 35 | `a9d8a4b671023c930ae095c7f750f34e32ac0785a7411f631efcbe89cfde3693` |
| [Mini TKP](content/cpns/mini-tkp-01.tsv) | 45 | `c07057672b7cb8b6f5e96e1895fdeea923f0d728dbc16080c45eaf462f827453` |
| [Drill pools v1](content/cpns/drill-pools-v1.tsv) | 270 | `4fec84e3ecacb952f518b6e8dd0dc81bfb2935df2ad029cd303fe6c4f8d87fd9` |

These checksums are historical candidate values. Current values and per-node frozen Drill checksums appear in the final audit below. A later content or asset replacement requires a version bump and new checksum. At the time of this review, no production assessment had been created; see the later creation record below. Activation and commerce remain out of scope.


## Final content review and asset resolution — 2026-10-07

This section supersedes the candidate review-state statements above. The audit covered 490 manifest rows and 352 unique selected question IDs. Production review records show 347 selected IDs with completed academic, editorial, and technical QA approvals matching the current question version. Five selected IDs have no complete approval set. After applying the asset gate, the unique-question states are:

| State | Unique questions |
|---|---:|
| APPROVED | 342 |
| BLOCKED_ASSET | 5 |
| NEEDS_REVIEW | 5 |
| REJECTED in selected manifests | 0 |

The five IDs still needing content review are `CPNS-SKD-P1-005`, `CPNS-SKD-P1-007`, `CPNS-SKD-P1-020`, `CPNS-SKD-P1-025`, and `CPNS-SKD-P1-026`. The two known defective questions remain excluded and are recorded as `REJECTED` in the review ledger: `TIU-000078` (no usable visual asset) and `TIU-000095` (duplicate option text). Neither is included in the 352 selected IDs.

Read-only aggregate checks for the selected IDs found: all 352 are published and have the current version snapshot; all have at least two options; no selected question has duplicate normalized option text; all 184 TWK and 84 TIU questions have one correctness marker; all 84 TKP questions have scores on every option; and the selected set has no exact normalized stem duplicates. No answer key or per-option correctness value is included in this report. Near-duplicate review was not performed because the repository has no safe reviewed tool for it.

Replacement validation: `TIU-000013` replaces `TIU-000095` in Full and has the same Analitis taxonomy plus all three approvals on version 1. `TIU-000020` replaces `TIU-000095` in the parent Kemampuan Verbal Drill pool; it is also Analitis and has all three approvals on version 1. `TIU-000125` replaces `TIU-000078` in Analogi Figural and has all three content-review approvals, but its image dependency is staging-only, so it is blocked rather than approved for freeze. No eligible, image-complete published alternative exists in the current production Analogi Figural node: its four published entries are `TIU-000078`, `TIU-000080`, `TIU-000125`, and `TIU-000126`; the first two lack usable images and the latter two use staging assets. No replacement was fabricated.

### Asset resolution plan

The five candidate asset references point to `lpgrivowdcepcxradavu.supabase.co` (staging), bucket `question-images`. All ten question/explanation PNG objects exist in staging storage; no corresponding object was found at the same path in production. The production question version 1 snapshot references each exact staging object path. The staging project has the objects but no corresponding question-version row to establish a source-version join. Production records mark the questions as `legacy_migration`; no explicit asset ownership/license/provenance record was found. Each row is therefore `NEEDS_OWNER`, with no upload or reference change performed. Exact paths, production destinations proposed (not created), and per-object metadata are in [asset-resolution-v1.tsv](content/cpns/asset-resolution-v1.tsv).

### Current manifest files and checksums

The following checksums cover exact current TSV bytes. Mini TWK/TKP and seven Drill node hashes are frozen approved values; the remaining files are blocked candidate data. Earlier checksums are historical candidate values.

| Manifest | Rows | State | SHA-256 |
|---|---:|---|---|
| Full Tryout | 110 | CANDIDATE / HOLD | `79e72dffb7fd2bad308eaad13b0afea7c9832edf3bd566c287db0d6cefc3a089` |
| Mini TWK | 30 | APPROVED / FROZEN V1 | `31c4f026250951318dd0cdc31ca5721fba6d50a462841c1a5998fa6422502787` |
| Mini TIU | 35 | CANDIDATE / HOLD | `5f5fed09ca2746e2afaf18a050f31a01f08068828a0974813813d4520d505f69` |
| Mini TKP | 45 | APPROVED / FROZEN V1 | `1314064dcae2250a424148b40a9526fe6e42f50df8b961b3d90a489535c29657` |
| Drill pools v1 | 270 | PARTIAL; 7 nodes frozen | `c6a99fd9dd9ce0215cd0fd5dc1e1d61d5d834fdbc10d7b2886b47a1fc551c3b2` |

Per-question evidence is in [question-review-v1.tsv](content/cpns/question-review-v1.tsv). Full Tryout and Mini TIU remain blocked by required assets. The Integritas and Pancasila Drill pools remain unavailable because they have fewer than 30 approved questions. CPNS Pass and token products remain archived, legacy assessments remain untouched. The assessment-creation state is superseded by the section below.

### Independent manifest freeze status

| Manifest/pool | Content status | Reason |
|---|---|---|
| Full Tryout | HOLD | 107 approved, 3 asset-blocked (TIU-000120/125/126). |
| Mini TWK | FROZEN V1 | 30/30 approved; existing staging contract and structure pass. |
| Mini TIU | HOLD | 31 approved, 4 asset-blocked (TIU-000121/122/125/126). |
| Mini TKP | FROZEN V1 | 45/45 approved; existing staging contract and structure pass. |
| Drill pools | PARTIAL FREEZE | 7 ready nodes (30/30 approved); Integritas 29/30 and Pancasila 26/30 remain unavailable. |

Mini TWK and Mini TKP TSV rows now use `content_version=approved-v1`. Drill rows carry per-node `pool_state`; the frozen ready pools are enumerated in [drill-node-readiness-v1.tsv](content/cpns/drill-node-readiness-v1.tsv). The Full, Mini TIU, and two deficient Drill pools retain candidate state.

The 10 asset dependencies (question and explanation image per affected question) are present in staging storage; no same-path production object was found. All use PNG and the production question snapshot embeds the staging URL in version 1. No staging-side question-version record was available to establish an independent version link, and ownership/license provenance is absent. All 10 decisions remain `NEEDS_OWNER`; no asset was copied and no production reference was changed.

## Canonical draft assessment creation — 2026-10-07

Production target was reverified as Siap Tempur, project ref `llnttutwhtvxtdktiizo`. This update records two data-only DRAFT assessments created from frozen, approved manifests. No schema migration, application deployment, activation, product change, or legacy edit occurred.

### Created Mini assessments

| Canonical assessment | Production ID | Manifest | Source manifest SHA-256 | DB binding SHA-256 | Questions | Configuration | State |
|---|---|---|---|---|---:|---|---|
| SKD CPNS Mini TWK 01 | `9f8f1b76-631d-4542-ba63-eb624533f418` | [mini-twk-01.tsv](content/cpns/mini-twk-01.tsv) | `31c4f026250951318dd0cdc31ca5721fba6d50a462841c1a5998fa6422502787` | `a1d830c55119bfa41d43815cae0f858bb654cd9b049ac4d1906f0489cb7dec8d` | 30 | TWK, 1,800 sec, passing score 65, fixed manifest order | DRAFT CREATED |
| SKD CPNS Mini TKP 01 | `ceb39ab0-f1a8-42da-b36a-1b4080ed3424` | [mini-tkp-01.tsv](content/cpns/mini-tkp-01.tsv) | `1314064dcae2250a424148b40a9526fe6e42f50df8b961b3d90a489535c29657` | `6f0e974a8e336c48f23c36578040c60cfdeb4db940b7357b820099b3fdb0e443` | 45 | TKP, 2,700 sec, passing score 166, fixed manifest order; graded option scores retained | DRAFT CREATED |

The DB binding SHA-256 uses ordered rows `question_id<TAB>question_version<TAB>position`, joined by newline. For each Mini, the manifest projection and production binding projection hashes match. Read-only parity checks found no missing or extra IDs, no order/version mismatch, all questions still published with their active frozen versions, taxonomy matches, current academic/editorial/technical approvals, and no staging asset reference. All 45 TKP questions still have scored options. The source TSV SHA is the full-file checksum; the DB binding SHA is a separate parity fingerprint.

### Drill creation held for model compatibility

No Drill assessment was created. The current CPNS participant path starts Drill by subject and requested knowledge-node name; `ExamRepository.findExam` resolves an active assessment by subject, while `buildQuestionSet` selects and shuffles from the live published node bank when a knowledge-node name is supplied. That branch does not consume `exam_question_items` or enforce frozen `question_version` IDs. Staging's current CPNS Drill configuration likewise has one dynamic pool per subject and no static item bindings. Creating seven per-node records now would not make participants use the seven approved frozen pools, and creating three subject-level records would have no manifest-specific fixed pool to bind.

The seven approved node manifests remain unchanged and ready as content inputs: Nasionalisme, Bela Negara, Pilar Negara, UUD 1945, Bahasa Negara, Kemampuan Verbal, and Kemampuan Numerik (30 approved IDs each). A separate application change is needed to resolve the selected node to its frozen approved pool before any corresponding production Drill draft can truthfully claim manifest parity. That change must be validated in staging before Drill creation/technical QA.

### Safety checks after creation

| Check | Result |
|---|---|
| Mini TWK manifest parity and order | PASS — 30/30; no missing/extra bindings; DB binding SHA matches |
| Mini TKP manifest parity and order | PASS — 45/45; no missing/extra bindings; DB binding SHA matches |
| New Mini status and participant resolver eligibility | PASS — both `draft`; zero matches for active/scheduled/published/ready resolver states |
| Full Tryout / Mini TIU | NOT CREATED — blocked asset manifests |
| Drill assessments | NOT CREATED — dynamic CPNS selector does not honor frozen pool bindings |
| Legacy Full/Mini/Practice | UNCHANGED — all remain `draft`, with zero sections and zero question bindings |
| Active CPNS assessments | 0 |
| CPNS Pass/token products | 7/7 remain `ARCHIVED` |

No production question, question version, participant answer, result, entitlement, token balance, or legacy assessment was changed. Draft creation does not satisfy CPNS commercial readiness. Full Tryout remains HOLD, Mini TIU remains HOLD, Drill remains HOLD pending the selector fix, and commerce remains archived.

**Current decision:** `CANONICAL DRAFT CREATION = PARTIAL` (the two approved Minis were created and verified); `TECHNICAL QA = HOLD`; `PRODUCTION ACTIVATION = NOT AUTHORIZED`; `COMMERCE = KEEP ARCHIVED`.
