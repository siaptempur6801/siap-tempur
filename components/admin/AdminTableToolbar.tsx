import { adminInputClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import AdminToolbarFilterDisclosure from '@/components/admin/AdminToolbarFilterDisclosure'
import AdminDependentFilterReset from '@/components/admin/AdminDependentFilterReset'
import { Search } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'
import AdminSearchInput from './AdminSearchInput'

/** Select filter opsional di luar `status` — mis. peran, aksi, tipe dompet. */
export type AdminToolbarSelect = {
  name: string
  ariaLabel: string
  placeholder: string
  defaultValue: string
  options: ReadonlyArray<{ value: string; label: string }>
  clearOnChange?: readonly string[]
}

export default function AdminTableToolbar({
  pathname,
  search,
  status,
  statusOptions = [],
  statusPlaceholder = 'Semua status',
  placeholder,
  resultCount,
  program,
  track,
  contextHidden = true,
  selects = [],
  hiddenFields,
  searchName = 'q',
  statusName = 'status',
  dateRange,
}: {
  pathname: string
  dateRange?: { from: string; to: string }
  searchName?: string
  statusName?: string
  search: string
  status?: string
  statusOptions?: ReadonlyArray<{ value: string; label: string }>
  statusPlaceholder?: string
  placeholder?: string
  resultCount: number
  program?: string
  track?: string
  contextHidden?: boolean
  selects?: ReadonlyArray<AdminToolbarSelect>
  hiddenFields?: Record<string, string | undefined>
}) {
  const resetParams = new URLSearchParams()
  if (contextHidden && program && track) {
    resetParams.set('program', program)
    resetParams.set('track', track)
  }
  for (const [key, value] of Object.entries(hiddenFields || {})) {
    if (
      value &&
      key !== searchName &&
      key !== statusName &&
      !selects.some((select) => select.name === key) &&
      !['page', 'participant_page', 'selector_page', 'question_page'].includes(key)
    ) {
      resetParams.set(key, value)
    }
  }
  const resetHref = `${pathname}${resetParams.size ? `?${resetParams}` : ''}`
  const hasStatus = statusOptions.length > 0
  const hasFilters = hasStatus || selects.length > 0 || Boolean(dateRange)
  const activeSelect = (select: AdminToolbarSelect) =>
    Boolean(
      select.defaultValue &&
      !(select.name === 'domain' && select.defaultValue === program) &&
      !(select.name === 'level' && select.defaultValue === track),
    )
  const activeFilterCount =
    Number(Boolean(status && hasStatus)) +
    selects.filter(activeSelect).length +
    Number(Boolean(dateRange?.from || dateRange?.to))
  const anyFilter = Boolean(search || activeFilterCount)

  return (
    <section aria-label="Filter data" className="flex flex-col gap-3">
      <form
        action={pathname}
        className="admin-table-toolbar flex flex-wrap items-center gap-2"
        method="get"
      >
        <AdminDependentFilterReset />
        {contextHidden && program && track ? (
          <>
            <input type="hidden" name="program" value={program} />
            <input type="hidden" name="track" value={track} />
          </>
        ) : null}
        {Object.entries(hiddenFields ?? {}).map(([name, value]) =>
          value ? <input key={name} type="hidden" name={name} value={value} /> : null,
        )}

        {placeholder ? (
          <label className="relative w-full min-w-0 md:w-64 md:flex-none xl:w-80">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
              aria-hidden="true"
            />
            <AdminSearchInput name={searchName} value={search} placeholder={placeholder} />
          </label>
        ) : null}

        {hasFilters ? (
          <AdminToolbarFilterDisclosure
            activeFilterCount={activeFilterCount}
            summaryClassName={adminSecondaryButtonClass}
          >
            <div className="admin-toolbar-filter-controls">
              {hasStatus ? (
                <select
                  className={`${adminInputClass} sm:w-auto sm:min-w-40`}
                  name={statusName}
                  defaultValue={status ?? ''}
                  aria-label="Filter status"
                >
                  <option value="">{statusPlaceholder}</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}

              {selects[0] ? (
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="sr-only">{selects[0].ariaLabel}</span>
                  <select
                    className={`${adminInputClass} sm:w-auto sm:min-w-40`}
                    name={selects[0].name}
                    defaultValue={selects[0].defaultValue}
                    aria-label={selects[0].ariaLabel}
                    data-clear-fields={selects[0].clearOnChange?.join(',')}
                  >
                    <option value="">{selects[0].placeholder}</option>
                    {selects[0].options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {selects.length > 1 || dateRange ? (
                <details className="admin-more-filters group">
                  <summary className={`${adminSecondaryButtonClass} w-fit cursor-pointer`}>
                    Filter lainnya
                    {selects.slice(1).some(activeSelect) || dateRange?.from || dateRange?.to
                      ? ' · aktif'
                      : ''}
                  </summary>
                  <div className="mt-3 grid gap-3 rounded-lg bg-muted/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {selects.slice(1).map((select) => (
                      <label key={select.name} className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          {select.ariaLabel.replace(/^Filter /, '')}
                        </span>
                        <select
                          className={adminInputClass}
                          name={select.name}
                          defaultValue={select.defaultValue}
                          aria-label={select.ariaLabel}
                          data-clear-fields={select.clearOnChange?.join(',')}
                        >
                          <option value="">{select.placeholder}</option>
                          {select.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    {dateRange ? (
                      <>
                        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                          Dari tanggal
                          <input
                            className={adminInputClass}
                            name="from"
                            type="date"
                            defaultValue={dateRange.from}
                          />
                        </label>
                        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                          Sampai tanggal
                          <input
                            className={adminInputClass}
                            name="to"
                            type="date"
                            defaultValue={dateRange.to}
                          />
                        </label>
                      </>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </div>
          </AdminToolbarFilterDisclosure>
        ) : null}

        <div className="admin-toolbar-actions flex items-center gap-2">
          <button type="submit" className={adminSecondaryButtonClass}>
            Terapkan
          </button>
          <Link className={adminSecondaryButtonClass} href={resetHref}>
            Reset
          </Link>
        </div>
      </form>

      {anyFilter ? (
        <p role="status" className="text-xs font-normal text-muted-foreground">
          Filter aktif{search ? <> · kata kunci “{search}”</> : null}
          {status && hasStatus ? (
            <>
              {' '}
              · status {statusOptions.find((option) => option.value === status)?.label ?? status}
            </>
          ) : null}
          {selects.filter(activeSelect).map((select) => (
            <span key={select.name}>
              {' · '}
              {select.ariaLabel.replace(/^Filter /, '')}:{' '}
              {select.options.find((option) => option.value === select.defaultValue)?.label ??
                select.defaultValue}
            </span>
          ))}
          {activeFilterCount ? (
            <>
              {' '}
              · {activeFilterCount} filter · {resultCount} hasil
            </>
          ) : (
            <> · {resultCount} hasil</>
          )}
        </p>
      ) : null}
    </section>
  )
}
