import { redirect } from 'next/navigation'
import { Award, CalendarClock, Flag, Plus, Settings2, SlidersHorizontal, Trash2 } from 'lucide-react'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminFeedbackBanner,
    AdminHint,
    AdminMetric,
    AdminPage,
    AdminPageHeader,
    AdminSectionHeading,
    AdminStatusBadge,
    adminDangerButtonClass,
    adminInputClass,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { formatDateTime, formatDate } from '@/lib/admin-format'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { adminPlatformService, type SystemSettingRow } from '@/src/services/admin-platform.service'
import {
    deleteSystemSettingAction,
    setTrackPeriodActiveAction,
    upsertCertificateTemplateAction,
    upsertFeatureFlagAction,
    upsertSystemSettingAction,
} from '@/app/actions/admin-platform'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
 * `organization.manage` (B2B sekolah) dan `notification.manage` TIDAK
 * dibuatkan halaman: `docs/STATUS.md` §3 menetapkan B2B sekolah di luar cakupan
 * dan §4 menandai "Platform expansion (B2B, notifikasi, analytics)" sebagai
 * ditunda. Tabelnya kosong di staging maupun produksi dan tidak dirujuk satu
 * file kode pun.
 */

type SearchParams = {
    flag?: string
    template?: string
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

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    const permissions = new Set(authorization.permissions)

    if (!permissions.has(PERMISSIONS.SETTINGS_MANAGE)) {
        redirect('/cpns/dashboard?admin=no-access')
    }

    const settings = await adminPlatformService.getSettings()

    const editingFlag = params.flag && params.flag !== 'new'
        ? settings.feature_flags.find((flag) => flag.id === params.flag) ?? null
        : null
    const editingTemplate = params.template
        ? settings.certificate_templates.find((template) => template.id === params.template) ?? null
        : null
    const enabledFlags = settings.feature_flags.filter((flag) => flag.enabled).length
    const activeTrackPeriods = settings.track_periods.filter((trackPeriod) => trackPeriod.is_active).length

    return (
        <AdminPage>
            <AdminPageHeader
                title="Settings"
                description="Konfigurasi platform: feature flag, katalog fitur, template sertifikat, periode, dan pengaturan operasional."
                steps={['Atur feature flag', 'Kelola katalog fitur & template sertifikat', 'Set periode track', 'Simpan pengaturan operasional']}
            />

                        <AdminFeedbackBanner ok={params.ok} error={params.error}/>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AdminMetric label="Feature flag" value={settings.feature_flags.length} helper={`${enabledFlags} aktif`} icon={<Flag size={18}/>} tone={settings.feature_flags.length ? 'blue' : 'neutral'}/>
                <AdminMetric label="Fitur terdaftar" value={settings.features.length} helper="Dirujuk oleh entitlement" icon={<SlidersHorizontal size={18}/>} tone="violet"/>
                <AdminMetric label="Track period aktif" value={activeTrackPeriods} helper={`${settings.track_periods.length} terdaftar`} icon={<CalendarClock size={18}/>} tone={activeTrackPeriods ? 'green' : 'neutral'}/>
                <AdminMetric label="Pengaturan manual" value={settings.system_settings.length} helper="Key-value bebas" icon={<Settings2 size={18}/>} tone="neutral"/>
            </section>

            {/* ---------------------------------------------------- feature flags */}
            <AdminCard className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                    <AdminSectionHeading step={1} title="Feature flag" description="Saklar fitur dengan rollout bertahap. Perubahan berlaku segera."/>
                    <a className={adminPrimaryButtonClass} href="/admin/settings?flag=new"><Plus size={16}/>Flag baru</a>
                </div>

                {params.flag ? (
                    <form action={upsertFeatureFlagAction} className="grid gap-4 border-b border-slate-200 bg-blue-50/40 p-5 lg:grid-cols-3">
                        <input type="hidden" name="flag_id" value={editingFlag?.id ?? ''}/>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Key</span>
                            <input className={adminInputClass} name="key" required defaultValue={editingFlag?.key ?? ''} placeholder="tka.sma.enabled"/>
                            <span className="block text-[11px] font-medium text-slate-500">2–64 karakter: a–z, 0–9, _ . atau -</span>
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Nama</span>
                            <input className={adminInputClass} name="name" required minLength={2} defaultValue={editingFlag?.name ?? ''} placeholder="Aktifkan TKA SMA"/>
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Rollout (%)</span>
                            <input className={adminInputClass} name="rollout_percentage" type="number" min="0" max="100" defaultValue={editingFlag?.rollout_percentage ?? 0}/>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" name="enabled" defaultChecked={editingFlag?.enabled ?? false} className="h-4 w-4 rounded border-slate-300"/>
                            <span className="text-sm font-bold text-slate-700">Aktif</span>
                        </label>
                        <div className="flex flex-wrap items-end gap-2 lg:col-span-3">
                            <button className={adminPrimaryButtonClass}>{editingFlag ? 'Simpan flag' : 'Buat flag'}</button>
                            <a className={adminSecondaryButtonClass} href="/admin/settings">Batal</a>
                        </div>
                    </form>
                ) : null}

                {settings.feature_flags.length === 0 ? (
                    <AdminEmptyState title="Belum ada feature flag" description="Buat flag pertama untuk mengendalikan fitur tanpa deploy ulang."/>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {settings.feature_flags.map((flag) => (
                            <div key={flag.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50/70">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-black text-slate-900">{flag.key}</span>
                                        <AdminBadge variant={flag.enabled ? 'green' : 'neutral'}>{flag.enabled ? 'Aktif' : 'Nonaktif'}</AdminBadge>
                                        <AdminBadge variant="blue">rollout {flag.rollout_percentage}%</AdminBadge>
                                    </div>
                                    <div className="mt-1 text-xs font-semibold text-slate-500">{flag.name}</div>
                                    {flag.config != null ? (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-[11px] font-extrabold uppercase tracking-wide text-slate-500 hover:text-slate-600">Lihat config</summary>
                                            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-slate-200">{jsonText(flag.config)}</pre>
                                        </details>
                                    ) : null}
                                </div>
                                <a className="inline-flex min-h-8 items-center rounded-lg text-xs font-extrabold text-blue-600 hover:text-blue-700" href={`/admin/settings?flag=${flag.id}`} aria-label={`Ubah flag ${flag.key || flag.id}`}>Ubah</a>
                            </div>
                        ))}
                    </div>
                )}
            </AdminCard>

            {/* -------------------------------------------- katalog fitur (rujukan) */}
            <AdminCard className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading
                        step={2}
                            title="Katalog fitur"
                        description="Daftar fitur yang bisa dimiliki pengguna lewat pass atau pembelian. Hanya-baca: kode fitur dirujuk langsung oleh kode aplikasi."
                    />
                </div>
                {settings.features.length === 0 ? (
                    <AdminEmptyState title="Belum ada fitur" description="Katalog fitur masih kosong."/>
                ) : (
                    <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                        {settings.features.map((feature) => (
                            <div key={feature.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-black text-slate-900">{feature.name}</div>
                                        <div className="mt-0.5 truncate font-mono text-[10px] font-semibold text-slate-500">{feature.code}</div>
                                    </div>
                                    <AdminBadge variant={feature.entitlements > 0 ? 'violet' : 'neutral'}>{feature.entitlements} pemilik</AdminBadge>
                                </div>
                                {feature.description ? <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{feature.description}</p> : null}
                            </div>
                        ))}
                    </div>
                )}
            </AdminCard>

            {/* ------------------------------------------------ template sertifikat */}
            <AdminCard className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading
                        step={3}
                            title="Template sertifikat"
                        description="Template yang dipakai generator sertifikat event. URL tidak boleh dikosongkan selama masih ada sertifikat yang memakainya."
                    />
                </div>
                {settings.certificate_templates.length === 0 ? (
                    <AdminEmptyState title="Belum ada template" description="Tambahkan template sebelum menerbitkan sertifikat."/>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {settings.certificate_templates.map((template) => (
                            <div key={template.id} className="px-5 py-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Award className="text-blue-500" size={16}/>
                                            <span className="text-sm font-black text-slate-900">{template.name}</span>
                                            <AdminBadge variant={template.certificates > 0 ? 'green' : 'neutral'}>{template.certificates} sertifikat</AdminBadge>
                                        </div>
                                        <div className="mt-1 break-all font-mono text-[11px] font-semibold text-slate-500">{template.template_url || 'URL belum diisi'}</div>
                                    </div>
                                    <a className="inline-flex min-h-8 items-center rounded-lg text-xs font-extrabold text-blue-600 hover:text-blue-700" href={`/admin/settings?template=${template.id}`} aria-label={`Ubah template ${template.name || template.id}`}>Ubah</a>
                                </div>

                                {editingTemplate?.id === template.id ? (
                                    <form action={upsertCertificateTemplateAction} className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
                                        <input type="hidden" name="template_id" value={template.id}/>
                                        <label className="space-y-1.5">
                                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Nama</span>
                                            <input className={adminInputClass} name="name" required minLength={2} defaultValue={template.name}/>
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Template URL / path</span>
                                            <input className={adminInputClass} name="template_url" defaultValue={template.template_url ?? ''}/>
                                        </label>
                                        <label className="space-y-1.5 lg:col-span-2">
                                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Config (JSON)</span>
                                            <textarea className={`${adminInputClass} min-h-32 resize-y font-mono text-xs`} name="config" defaultValue={jsonText(template.config)} placeholder={CONFIG_PLACEHOLDER}/>
                                        </label>
                                        <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
                                            <button className={adminPrimaryButtonClass}>Simpan template</button>
                                            <a className={adminSecondaryButtonClass} href="/admin/settings">Batal</a>
                                        </div>
                                    </form>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </AdminCard>

            {/* --------------------------------------------------- periode per track */}
            <AdminCard className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading
                        step={4}
                            title="Periode & track"
                        description="Periode aktif per program/track. Menonaktifkan track period menyembunyikan periodenya dari alur pengguna."
                    />
                </div>
                {settings.periods.length > 0 ? (
                    <div className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-2 xl:grid-cols-3">
                        {settings.periods.map((period) => (
                            <div key={period.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-black text-slate-900">{period.name}</div>
                                        <div className="mt-0.5 font-mono text-[10px] font-semibold text-slate-500">{period.code}</div>
                                    </div>
                                    <AdminStatusBadge status={period.status}/>
                                </div>
                                <div className="mt-2 text-xs font-semibold text-slate-500">{formatDate(period.start_date)} — {formatDate(period.end_date)}</div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {settings.track_periods.length === 0 ? (
                    <AdminEmptyState title="Belum ada track period" description="Hubungkan track ke sebuah periode untuk mengaktifkannya."/>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {settings.track_periods.map((trackPeriod) => (
                            <form key={trackPeriod.id} action={setTrackPeriodActiveAction} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                <input type="hidden" name="track_period_id" value={trackPeriod.id}/>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-black text-slate-900">{trackPeriod.program_code} / {trackPeriod.track_code}</span>
                                        <AdminBadge variant={trackPeriod.is_active ? 'green' : 'neutral'}>{trackPeriod.is_active ? 'Aktif' : 'Nonaktif'}</AdminBadge>
                                    </div>
                                    <div className="mt-1 text-xs font-semibold text-slate-500">
                                        {trackPeriod.period_name || 'Tanpa periode'} · {formatDate(trackPeriod.start_date)} — {formatDate(trackPeriod.end_date)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" name="is_active" defaultChecked={trackPeriod.is_active} className="h-4 w-4 rounded border-slate-300"/>
                                        <span className="text-xs font-bold text-slate-600">Aktif</span>
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
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading
                        step={5}
                        title="Pengaturan operasional"
                        description="Key-value bebas untuk konfigurasi yang tidak butuh deploy. Nilai boleh berupa JSON; teks biasa disimpan sebagai string."
                    />
                </div>

                <form action={upsertSystemSettingAction} className="grid gap-4 border-b border-slate-200 bg-slate-50/70 p-5 lg:grid-cols-[1fr_2fr_auto]">
                    <label className="space-y-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Key</span>
                        <input className={adminInputClass} name="key" required placeholder="maintenance.banner"/>
                        <span className="block text-[11px] font-medium text-slate-500">2–64 karakter: a–z, 0–9, _ . atau -</span>
                    </label>
                    <label className="space-y-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Nilai</span>
                        <input className={`${adminInputClass} font-mono text-xs`} name="value" required placeholder='{"text":"Sedang maintenance"}'/>
                        <span className="block text-[11px] font-medium text-slate-500">Kosongkan tanda kutip untuk teks biasa.</span>
                    </label>
                    <div className="flex items-end">
                        <button className={adminPrimaryButtonClass}><Plus size={16}/>Simpan</button>
                    </div>
                </form>

                {settings.system_settings.length === 0 ? (
                    <AdminEmptyState title="Belum ada pengaturan" description="Tabel system_settings masih kosong. Tambahkan key pertama di atas."/>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {settings.system_settings.map((setting) => (
                            <div key={setting.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                <div className="min-w-0">
                                    <div className="font-mono text-sm font-black text-slate-900">{setting.key}</div>
                                    <div className="mt-1 break-all text-xs font-semibold text-slate-600">{valuePreview(setting)}</div>
                                    <div className="mt-1 text-[11px] font-medium text-slate-500">
                                        Diubah {formatDateTime(setting.updated_at)}{setting.updated_by_name ? ` oleh ${setting.updated_by_name}` : ''}
                                    </div>
                                </div>
                                <form action={deleteSystemSettingAction}>
                                    <input type="hidden" name="key" value={setting.key}/>
                                    <ConfirmSubmit
                                        message={`Hapus pengaturan “${setting.key}”?`}
                                        detail="Pengaturan yang dihapus tidak bisa dikembalikan dari halaman ini — nilai lama hilang. Catat nilainya lebih dulu bila masih mungkin dibutuhkan."
                                        confirmLabel="Hapus pengaturan"
                                        trigger={<button type="button" className={adminDangerButtonClass}><Trash2 size={15}/>Hapus</button>}
                                    />
                                </form>
                            </div>
                        ))}
                    </div>
                )}
            </AdminCard>

            <AdminHint>
                Halaman ini memerlukan permission <code className="font-mono">settings.manage</code>.
                Halaman untuk <code className="font-mono">organization.manage</code> (B2B sekolah) dan
                {' '}<code className="font-mono">notification.manage</code> belum dibuat karena keduanya berstatus
                <b> ditunda</b> di <code className="font-mono">docs/STATUS.md</code> dan tabelnya belum dipakai kode mana pun.
            </AdminHint>
        </AdminPage>
    )
}
