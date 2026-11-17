/**
 * Pemetaan scope Tempur Pass — modul **tanpa dependensi server**.
 *
 * Dipisah dari `tempur-pass.service.ts` karena dipakai juga oleh komponen klien (shell sidebar)
 * untuk menjelaskan cakupan pass. Service tetap mengekspor ulang fungsi-fungsi ini supaya
 * pemanggil lama tidak berubah.
 */

export type PassScope = 'cpns' | 'tka:sd' | 'tka:smp' | 'tka:sma'

export const PASS_SCOPES: readonly PassScope[] = ['cpns', 'tka:sd', 'tka:smp', 'tka:sma'] as const

/** Fitur penanda pass per scope (dipakai untuk cek aktif/tidak). */
export const PASS_FEATURE_BY_SCOPE: Record<PassScope, string> = {
    cpns: 'cpns.full_tryout.regular',
    'tka:sd': 'tka.sd.full_tryout.regular',
    'tka:smp': 'tka.smp.full_tryout.regular',
    'tka:sma': 'tka.sma.full_tryout.regular',
}

const TKA_LEVEL_SCOPE: Record<string, PassScope> = {
    SD: 'tka:sd',
    SMP: 'tka:smp',
    SMA: 'tka:sma',
}

/** Scope pass untuk jenjang TKA ('SD' | 'SMP' | 'SMA'). */
export function passScopeForTkaLevel(level: string): PassScope {
    return TKA_LEVEL_SCOPE[level.toUpperCase()] ?? 'tka:smp'
}

/** Jenjang TKA (huruf besar) dari scope pass; null untuk scope non-TKA. */
export function tkaLevelFromPassScope(scope: PassScope): string | null {
    return scope.startsWith('tka:') ? scope.slice('tka:'.length).toUpperCase() : null
}

/** Label cakupan pass yang siap ditampilkan (mis. "TKA SD", "CPNS"). */
export function passScopeLabel(scope: PassScope): string {
    return scope === 'cpns' ? 'CPNS' : `TKA ${tkaLevelFromPassScope(scope)}`
}
