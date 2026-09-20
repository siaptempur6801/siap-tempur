/**
 * Peta tab Workspace Admin.
 *
 * `app/admin/AdminOperationsWorkspace.tsx` adalah SATU komponen server yang
 * melayani beberapa tab (`products`, `events`, `questions`, `commerce`). Tiap
 * tab punya route, judul, domain data, dan permission sendiri.
 *
 * Pemetaan itu tinggal di modul murni ini, bukan di dalam komponen, karena
 * pernah terjadi bug yang hanya bisa dicegah dengan menguji pemetaannya:
 *
 * > Mode `events` memuat `['events', 'products']`, sementara modal "Tambah sesi"
 * > membaca `data.exams`. Karena `data.exams` selalu kosong di mode itu,
 * > dropdown "Exam EVENT" tidak pernah punya satu opsi pun — sesi event tidak
 * > bisa dibuat sama sekali dari UI, dan tidak ada error yang terlihat.
 *
 * Bug seperti itu lolos dari typecheck (keduanya `string[]`), lolos dari E2E
 * (halaman tetap render), dan hanya terlihat kalau seseorang benar-benar
 * mencoba menambah sesi. Karena itu pemetaannya diekspor dan dikunci test.
 *
 * Modul ini SENGAJA bebas dependensi server (tanpa React, tanpa Supabase) supaya
 * dapat diimpor unit test. `PERMISSIONS` aman: itu objek konstanta murni.
 */

import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'

export type AdminOperationsMode = 'products' | 'events' | 'questions' | 'commerce'

/**
 * Domain data yang dapat dimuat `adminV2Service.getWorkspaceData`.
 *
 * Sengaja dideklarasikan ulang sebagai union literal, bukan diimpor dari
 * `admin-v2.service`, supaya modul ini tetap murni. Kecocokannya dengan tipe
 * milik service ditegakkan compiler di sisi pemanggil: `AdminOperationsWorkspace`
 * menyerahkan nilai dari sini ke parameter `sections?: readonly WorkspaceSection[]`.
 */
export type AdminWorkspaceSection = 'products' | 'events' | 'exams' | 'questions' | 'commerce'

/** Route kanonik tiap tab. Setiap nilai harus benar-benar punya `page.tsx`. */
export const ADMIN_OPERATIONS_ROUTES: Record<AdminOperationsMode, string> = {
    products: '/admin/commerce/products',
    events: '/admin/assessment/events',
    questions: '/admin/content/questions',
    commerce: '/admin/commerce',
}

/** Judul dan deskripsi halaman tiap tab. */
export const ADMIN_OPERATIONS_PAGE_COPY: Record<AdminOperationsMode, { title: string; description: string }> = {
    products: { title: 'Products', description: 'Kelola paket, harga, durasi, dan grant untuk context aktif.' },
    events: { title: 'Events', description: 'Kelola event, sesi pelaksanaan, dan produk tiket untuk context aktif.' },
    questions: { title: 'Question Bank', description: 'Kelola soal operasional, opsi jawaban, versi, dan status publikasi.' },
    commerce: { title: 'Orders & Payments', description: 'Monitor order dan payment terbaru. Data commerce masih global lintas program.' },
}

/**
 * Domain data yang dibutuhkan tiap tab.
 *
 * Setiap mode hanya merender satu domain, tetapi sebelumnya SELURUH domain
 * di-query — membuka tab "Products" ikut menarik 80 soal beserta seluruh
 * opsinya (setiap opsi memuat `content`). Pemetaan ini yang menghentikannya.
 *
 * Mode `events` butuh tiga domain, dan keduanya selain `events` adalah
 * ketergantungan nyata di formulirnya:
 *
 * - `products` — formulir event menautkan event ke product lewat `eventProducts`;
 * - `exams` — modal "Tambah sesi" memilih exam bertipe EVENT.
 *
 * Catatan cakupan: daftar exam diambil dari `getWorkspaceData` yang dibatasi 80
 * baris terbaru. Bila suatu context punya lebih dari 80 exam, exam EVENT lama
 * dapat tidak muncul di dropdown. Perbaikan penuh menyusul bersama pagination
 * daftar admin (lihat backlog Fase 1 butir S6).
 */
export const ADMIN_OPERATIONS_SECTIONS: Record<AdminOperationsMode, readonly AdminWorkspaceSection[]> = {
    products: ['products'],
    events: ['events', 'products', 'exams'],
    questions: ['questions'],
    commerce: ['commerce'],
}

/**
 * Permission yang membuka tiap mode.
 *
 * Dipakai untuk memeriksa izin SEBELUM menyentuh database. Sebelumnya urutannya
 * terbalik: `getWorkspaceData()` dipanggil lebih dulu, baru permission dicek
 * terhadap permission set. Akibatnya peran yang tidak punya izin (mis. FINANCE
 * membuka Question Bank) tetap menunggu query soal + seluruh opsinya, exam,
 * event, product, dan order selesai — lalu disuguhi "Akses tidak tersedia".
 *
 * Cukup SALAH SATU permission pada daftar; halaman commerce melayani pembaca
 * order maupun pemegang izin payment.
 */
export const ADMIN_OPERATIONS_PERMISSIONS: Record<AdminOperationsMode, readonly PermissionCode[]> = {
    products: [PERMISSIONS.PRODUCT_MANAGE],
    events: [PERMISSIONS.EVENT_MANAGE],
    questions: [PERMISSIONS.QUESTION_MANAGE],
    commerce: [PERMISSIONS.ORDER_READ, PERMISSIONS.PAYMENT_MANAGE],
}
