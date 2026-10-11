import Link from '@/components/admin/navigation/AdminLink'
import {
  deleteSystemSettingAction,
  setTrackPeriodActiveAction,
  upsertCertificateTemplateAction,
  upsertFeatureFlagAction,
  upsertSystemSettingAction,
} from '@/app/actions/admin-platform'
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminFeedbackBanner,
  AdminMetric,
  AdminPage,
  AdminPageHeader,
  AdminSectionHeading,
  AdminStatusBadge,
  AdminTh,
  adminDangerButtonClass,
  adminInputClass,
  adminSecondaryButtonClass,
  adminTableActionClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import AdminWorkspaceTabs from '@/components/admin/AdminWorkspaceTabs'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminFormActions } from '@/components/admin/forms/AdminFormActions'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { formatDate, formatDateTime } from '@/lib/admin-format'
import { PERMISSIONS } from '@/src/auth/permissions'
import { adminPlatformService, type SystemSettingRow } from '@/src/services/admin-platform.service'
import { authorizationService } from '@/src/services/authorization.service'
import {
  Award,
  CalendarClock,
  Flag,
  Plus,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { redirect } from 'next/navigation'

/**
 * Settings — konfigurasi platform.
 *
 * Halaman ini mengisi permission `settings.manage`. Yang dikelola adalah data
 * yang BENAR-BENAR dipakai kode produksi:
 *
 *   - `feature_flags`      → saklar fitur
 *   - `features`           → katalog fitur yang dirujuk `entitlements`
 *                            (`tempur-pass.service.ts`, `pass-catalog.service.ts`)
 *   - `certificate_templates` → dipakai `app/actions/event-certificate.ts`
 *   - `periods`/`track_periods` → periode aktif per track
 *   - `system_settings`    → key-value bebas untuk konfigurasi operasional
 *
 */

type SearchParams = {
  flag?: string
  template?: string
  setting?: string
  ok?: string
  error?: string
}

const CONFIG_PLACEHOLDER = '{\n  "key": "value"\n}'

function jsonText(value: unknown) {
  if (value == null) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

function valuePreview(setting: SystemSettingRow) {
  const value = setting.value
  if (value == null) return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const authorization = await authorizationService.requireAuthenticated()
  const permissions = new Set(authorization.permissions)

  if (!permissions.has(PERMISSIONS.SETTINGS_MANAGE)) {
    if (permissions.has(PERMISSIONS.AUDIT_READ)) redirect('/admin/settings/audit')
    redirect('/cpns/dashboard?admin=no-access')
  }

  const settings = await adminPlatformService.getSettings()

  const editingFlag =
    params.flag && params.flag !== 'new'
      ? (settings.feature_flags.find((flag) => flag.id === params.flag) ?? null)
      : null
  const editingTemplate = params.template
    ? (settings.certificate_templates.find((template) => template.id === params.template) ?? null)
    : null
  const editingSetting = params.setting
    ? (settings.system_settings.find((setting) => setting.key === params.setting) ?? null)
    : null
  const enabledFlags = settings.feature_flags.filter((flag) => flag.enabled).length
  const activeTrackPeriods = settings.track_periods.filter(
    (trackPeriod) => trackPeriod.is_active,
  ).length

  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Settings' }]} />
      <AdminPageHeader
        title="Settings"
        description="Konfigurasi platform: feature flag, katalog fitur, template sertifikat, periode, dan pengaturan operasional."
      />
      <AdminWorkspaceTabs workspace="settings" permissions={authorization.permissions} />

      <AdminFeedbackBanner ok={params.ok} error={params.error} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric
          label="Feature flag"
          value={settings.feature_flags.length}
          helper={`${enabledFlags} aktif`}
          icon={<Flag size={18} />}
          tone={settings.feature_flags.length ? 'blue' : 'neutral'}
        />
        <AdminMetric
          label="Fitur terdaftar"
          value={settings.features.length}
          helper="Dirujuk oleh entitlement"
          icon={<SlidersHorizontal size={18} />}
          tone="violet"
        />
        <AdminMetric
          label="Track period aktif"
          value={activeTrackPeriods}
          helper={`${settings.track_periods.length} terdaftar`}
          icon={<CalendarClock size={18} />}
          tone={activeTrackPeriods ? 'green' : 'neutral'}
        />
        <AdminMetric
          label="Pengaturan manual"
          value={settings.system_settings.length}
          helper="Key-value bebas"
          icon={<Settings2 size={18} />}
          tone="neutral"
        />
      </section>

      {/* ---------------------------------------------------- feature flags */}
      <AdminCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <AdminSectionHeading
            title="Feature flag"
            description="Saklar fitur dengan rollout bertahap. Perubahan berlaku segera."
          />
          <Link className={adminSecondaryButtonClass} href="/admin/settings?flag=new">
            <Plus size={16} />
            Flag baru
          </Link>
        </div>

        {params.flag ? (
          <form data-admin-form action={upsertFeatureFlagAction} className="p-5">
            <AdminFormSection title="Konfigurasi Feature Flag">
              <input type="hidden" name="flag_id" value={editingFlag?.id ?? ''} />
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Key</span>
                <input
                  className={adminInputClass}
                  name="key"
                  required
                  defaultValue={editingFlag?.key ?? ''}
                  placeholder="tka.sma.enabled"
                />
                <span className="block text-[11px] font-medium text-muted-foreground">
                  2–64 karakter: a–z, 0–9, _ . atau -
                </span>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Nama</span>
                <input
                  className={adminInputClass}
                  name="name"
                  required
                  minLength={2}
                  defaultValue={editingFlag?.name ?? ''}
                  placeholder="Aktifkan TKA SMA"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Rollout (%)</span>
                <input
                  className={adminInputClass}
                  name="rollout_percentage"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={editingFlag?.rollout_percentage ?? 0}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={editingFlag?.enabled ?? false}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm font-medium text-foreground">Aktif</span>
              </label>
            </AdminFormSection>
            <AdminFormActions cancelHref="/admin/settings">
              <button className={adminSecondaryButtonClass}>
                {editingFlag ? 'Simpan flag' : 'Buat flag'}
              </button>
            </AdminFormActions>
          </form>
        ) : null}

        {settings.feature_flags.length === 0 ? (
          <AdminEmptyState
            title="Belum ada feature flag"
            description="Buat flag pertama untuk mengendalikan fitur tanpa deploy ulang."
          />
        ) : (
          <div className="divide-y divide-border">
            {settings.feature_flags.map((flag) => (
              <div
                key={flag.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-muted/70"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {flag.key}
                    </span>
                    <AdminBadge variant={flag.enabled ? 'green' : 'neutral'}>
                      {flag.enabled ? 'Aktif' : 'Nonaktif'}
                    </AdminBadge>
                    <AdminBadge variant="blue">rollout {flag.rollout_percentage}%</AdminBadge>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-muted-foreground">
                    {flag.name}
                  </div>
                  {flag.config != null ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-muted-foreground">
                        Lihat config
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-slate-200">
                        {jsonText(flag.config)}
                      </pre>
                    </details>
                  ) : null}
                </div>
                <Link
                  className={adminTableActionClass}
                  href={`/admin/settings?flag=${flag.id}`}
                  aria-label={`Ubah flag ${flag.key || flag.id}`}
                >
                  Ubah
                </Link>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {/* -------------------------------------------- katalog fitur (rujukan) */}
      <AdminCard className="overflow-hidden">
        <div className="border-b border-border p-5">
          <AdminSectionHeading
            title="Katalog fitur"
            description="Daftar fitur yang bisa dimiliki pengguna lewat pass atau pembelian. Hanya-baca: kode fitur dirujuk langsung oleh kode aplikasi."
          />
        </div>
        <AdminDataTable
          caption="Katalog fitur"
          className="min-w-[750px]"
          empty={
            !settings.features.length
              ? { title: 'Belum ada fitur', description: 'Katalog fitur masih kosong.' }
              : undefined
          }
        >
          <thead className={adminTableHeadClass}>
            <tr>
              {['Fitur', 'Deskripsi', 'Pemilik akses'].map((label) => (
                <AdminTh key={label}>{label}</AdminTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {settings.features.map((feature) => (
              <tr key={feature.id}>
                <td className="font-medium">
                  {feature.name}
                  <details className="mt-1 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Kode fitur</summary>
                    <code>{feature.code}</code>
                  </details>
                </td>
                <td className="max-w-md text-xs text-muted-foreground">
                  {feature.description || '—'}
                </td>
                <td>{feature.entitlements}</td>
              </tr>
            ))}
          </tbody>
        </AdminDataTable>
      </AdminCard>

      {/* ------------------------------------------------ template sertifikat */}
      <AdminCard className="overflow-hidden">
        <div className="border-b border-border p-5">
          <AdminSectionHeading
            title="Template sertifikat"
            description="Template yang dipakai generator sertifikat event. URL tidak boleh dikosongkan selama masih ada sertifikat yang memakainya."
          />
        </div>
        {settings.certificate_templates.length === 0 ? (
          <AdminEmptyState
            title="Belum ada template"
            description="Tambahkan template sebelum menerbitkan sertifikat."
          />
        ) : (
          <div className="divide-y divide-border">
            {settings.certificate_templates.map((template) => (
              <div key={template.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Award className="text-blue-500" size={16} />
                      <span className="text-sm font-semibold text-foreground">{template.name}</span>
                      <AdminBadge variant={template.certificates > 0 ? 'green' : 'neutral'}>
                        {template.certificates} sertifikat
                      </AdminBadge>
                    </div>
                    <div className="mt-1 break-all font-mono text-[11px] font-semibold text-muted-foreground">
                      {template.template_url || 'URL belum diisi'}
                    </div>
                  </div>
                  <Link
                    className={adminTableActionClass}
                    href={`/admin/settings?template=${template.id}`}
                    aria-label={`Ubah template ${template.name || template.id}`}
                  >
                    Ubah
                  </Link>
                </div>

                {editingTemplate?.id === template.id ? (
                  <form data-admin-form action={upsertCertificateTemplateAction} className="p-5">
                    <AdminFormSection title="Template Sertifikat">
                      <input type="hidden" name="template_id" value={template.id} />
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Nama</span>
                        <input
                          className={adminInputClass}
                          name="name"
                          required
                          minLength={2}
                          defaultValue={template.name}
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Template URL / path
                        </span>
                        <input
                          className={adminInputClass}
                          name="template_url"
                          defaultValue={template.template_url ?? ''}
                        />
                      </label>
                      <label className="space-y-1.5 lg:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Config (JSON)
                        </span>
                        <textarea
                          className={`${adminInputClass} min-h-32 resize-y font-mono text-xs`}
                          name="config"
                          defaultValue={jsonText(template.config)}
                          placeholder={CONFIG_PLACEHOLDER}
                        />
                      </label>
                    </AdminFormSection>
                    <AdminFormActions cancelHref="/admin/settings">
                      <button className={adminSecondaryButtonClass}>Simpan template</button>
                    </AdminFormActions>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {/* --------------------------------------------------- periode per track */}
      <AdminCard className="overflow-hidden">
        <div className="border-b border-border p-5">
          <AdminSectionHeading
            title="Periode & track"
            description="Periode aktif per program/track. Menonaktifkan track period menyembunyikan periodenya dari alur pengguna."
          />
        </div>
        {settings.periods.length > 0 ? (
          <div className="grid gap-3 border-b border-border p-5 md:grid-cols-2 xl:grid-cols-3">
            {settings.periods.map((period) => (
              <div key={period.id} className="rounded-lg border border-border bg-muted p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {period.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                      {period.code}
                    </div>
                  </div>
                  <AdminStatusBadge status={period.status} />
                </div>
                <div className="mt-2 text-xs font-semibold text-muted-foreground">
                  {formatDate(period.start_date)} — {formatDate(period.end_date)}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {settings.track_periods.length === 0 ? (
          <AdminEmptyState
            title="Belum ada track period"
            description="Hubungkan track ke sebuah periode untuk mengaktifkannya."
          />
        ) : (
          <div className="divide-y divide-border">
            {settings.track_periods.map((trackPeriod) => (
              <form
                key={trackPeriod.id}
                action={setTrackPeriodActiveAction}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <input type="hidden" name="track_period_id" value={trackPeriod.id} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {trackPeriod.program_code} / {trackPeriod.track_code}
                    </span>
                    <AdminBadge variant={trackPeriod.is_active ? 'green' : 'neutral'}>
                      {trackPeriod.is_active ? 'Aktif' : 'Nonaktif'}
                    </AdminBadge>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-muted-foreground">
                    {trackPeriod.period_name || 'Tanpa periode'} ·{' '}
                    {formatDate(trackPeriod.start_date)} — {formatDate(trackPeriod.end_date)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={trackPeriod.is_active}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-xs font-medium text-muted-foreground">Aktif</span>
                  </label>
                  <button className={adminSecondaryButtonClass}>Simpan</button>
                </div>
              </form>
            ))}
          </div>
        )}
      </AdminCard>

      {/* --------------------------------------------------- system settings */}
      <AdminCard className="overflow-hidden">
        <div className="border-b border-border p-5">
          <AdminSectionHeading
            title="Pengaturan operasional"
            description="Key-value bebas untuk konfigurasi yang tidak butuh deploy. Nilai boleh berupa JSON; teks biasa disimpan sebagai string."
          />
        </div>

        <form data-admin-form action={upsertSystemSettingAction} className="p-5">
          <AdminFormSection
            title={editingSetting ? 'Ubah pengaturan' : 'Pengaturan Umum'}
            description={
              editingSetting
                ? 'Perbarui nilai konfigurasi operasional ini.'
                : 'Tambahkan key-value yang digunakan untuk konfigurasi operasional.'
            }
          >
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Key</span>
              <input
                className={adminInputClass}
                name="key"
                required
                readOnly={Boolean(editingSetting)}
                defaultValue={editingSetting?.key ?? ''}
                placeholder="maintenance.banner"
              />
              <span className="block text-[11px] font-medium text-muted-foreground">
                {editingSetting
                  ? 'Key tetap agar nilai yang ada diperbarui.'
                  : '2–64 karakter: a–z, 0–9, _ . atau -'}
              </span>
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Nilai</span>
              <textarea
                className={`${adminInputClass} min-h-28 resize-y font-mono text-xs`}
                name="value"
                required
                defaultValue={editingSetting ? jsonText(editingSetting.value) : ''}
                placeholder='{"text":"Sedang maintenance"}'
              />
              <span className="block text-[11px] font-medium text-muted-foreground">
                Teks biasa boleh ditulis langsung. Nilai JSON bisa diformat beberapa baris.
              </span>
            </label>
          </AdminFormSection>
          <AdminFormActions cancelHref="/admin/settings">
            <button className={adminSecondaryButtonClass}>
              {editingSetting ? (
                'Simpan perubahan'
              ) : (
                <>
                  <Plus size={16} />
                  Simpan
                </>
              )}
            </button>
          </AdminFormActions>
        </form>

        {settings.system_settings.length === 0 ? (
          <AdminEmptyState
            title="Belum ada pengaturan"
            description="Tambahkan pengaturan operasional pertama melalui form di atas."
          />
        ) : (
          <div className="divide-y divide-border">
            {settings.system_settings.map((setting) => (
              <div
                key={setting.key}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm font-semibold text-foreground">
                    {setting.key}
                  </div>
                  <div className="mt-1 break-all text-xs font-semibold text-muted-foreground">
                    {valuePreview(setting)}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-muted-foreground">
                    Diubah {formatDateTime(setting.updated_at)}
                    {setting.updated_by_name ? ` oleh ${setting.updated_by_name}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    className={adminTableActionClass}
                    href={`/admin/settings?${new URLSearchParams({ setting: setting.key })}`}
                  >
                    Ubah
                  </Link>
                  <form action={deleteSystemSettingAction}>
                    <input type="hidden" name="key" value={setting.key} />
                    <ConfirmSubmit
                      message={`Hapus pengaturan “${setting.key}”?`}
                      detail="Pengaturan yang dihapus tidak bisa dikembalikan dari halaman ini — nilai lama hilang. Catat nilainya lebih dulu bila masih mungkin dibutuhkan."
                      confirmLabel="Hapus pengaturan"
                      trigger={
                        <button type="button" className={adminDangerButtonClass}>
                          <Trash2 size={15} />
                          Hapus
                        </button>
                      }
                    />
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </AdminPage>
  )
}
