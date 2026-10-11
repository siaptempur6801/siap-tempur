/**
 * Membersihkan nilai pencarian sebelum dipakai di dalam ekspresi `or` PostgREST.
 *
 * `or=(...)` memakai koma sebagai pemisah kondisi dan tanda kurung sebagai
 * pengelompok, jadi nilai yang mengandung keduanya bisa mengubah bentuk filter —
 * bukan sekadar gagal. Karakter liarnya juga dibuang supaya `%` yang diketik
 * admin tidak berubah menjadi wildcard tak terbatas.
 *
 * Satu definisi untuk seluruh pencarian admin: sebelumnya `admin-workspace.service`
 * punya salinannya sendiri sementara `content-review.service` hanya membuang
 * `%_`, sehingga `,` dan `()` dari kata kunci bisa merusak ekspresi filter.
 */
export function escapePostgrestValue(value: string) {
  return value.replace(/[,()*%\\]/g, ' ').trim()
}
