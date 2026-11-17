const domains: Record<string, string> = {
  admin: 'Workspace admin',
  content: 'Konten',
  question: 'Bank soal',
  exam: 'Assessment',
  event: 'Event',
  organization: 'Instansi',
  report: 'Monitoring',
  order: 'Pesanan',
  payment: 'Pembayaran',
  product: 'Produk',
  entitlement: 'Akses',
  user: 'Pengguna',
  role: 'Peran',
  settings: 'Pengaturan',
  audit: 'Log audit',
  notification: 'Notifikasi',
}
const actions: Record<string, string> = {
  access: 'Akses',
  read: 'Lihat',
  create: 'Buat',
  update: 'Edit',
  manage: 'Kelola',
  review: 'Tinjau',
  assign: 'Tugaskan',
  publish: 'Terbitkan',
}
export function RolePermissions({ permissions }: { permissions: string[] }) {
  const grouped = new Map<string, string[]>()
  for (const permission of permissions) {
    const [domain, action] = permission.split('.')
    const label = domains[domain] || domain
    grouped.set(label, [...(grouped.get(label) || []), actions[action] || action])
  }
  return (
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
      {[...grouped].map(([domain, rights]) => (
        <div key={domain}>
          <dt className="text-xs font-medium text-foreground">{domain}</dt>
          <dd className="mt-1 text-xs text-muted-foreground">{rights.join(' · ')}</dd>
        </div>
      ))}
    </dl>
  )
}
