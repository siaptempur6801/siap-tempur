/**
 * Saldo token bisa negatif setelah refund/chargeback untuk token yang sudah terpakai
 * (audit A-10, keputusan pemilik 2026-11-17). Peserta perlu tahu alasannya.
 */
export function negativeTokenBalanceNote(balance: number | null | undefined) {
  if (typeof balance !== 'number' || balance >= 0) return null
  return 'Saldo minus karena dana pembelian dikembalikan setelah tokennya terpakai. Pembelian berikutnya menutup selisih ini lebih dulu.'
}
