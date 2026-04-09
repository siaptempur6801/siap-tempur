Folder ini menampung skrip SQL ad-hoc yang tidak lagi relevan sebagai migration aktif.

Yang dipindahkan ke sini:
- file tanpa prefix timestamp
- perubahan yang sudah tercakup di `supabase/schema.sql`
- perubahan yang sudah digantikan migration timestamped lain

Catatan:
- Migration historis yang sudah timestamped tetap disimpan di folder utama untuk menjaga urutan replay migration.
- Jangan memindahkan migration timestamped tanpa audit dependency dan riwayat deploy.
