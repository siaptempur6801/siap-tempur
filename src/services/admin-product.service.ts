import { productReadiness } from './admin-content-readiness.service'
import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import { DEFAULT_TOKEN_WALLET_TYPE } from '@/src/repositories/wallet.repository'
import { getAdminCatalog, nowIso, sameId, validNonNegative, validPositive } from '@/src/services/admin-service-utils'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

export class AdminProductService {
    async saveProduct(input: {
        id?: string | null
        code: string
        name: string
        description?: string | null
        productType: string
        durationDays?: number | null
        status: string
        price?: number | null
        currency?: string
        tokenGrant?: number | null
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await getAdminCatalog(input.context)
        const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_')
        if (!code || !input.name.trim()) throw new Error('PRODUCT_FIELDS_REQUIRED')
        if (!validNonNegative(input.price)) throw new Error('PRODUCT_PRICE_INVALID')
        if (!validNonNegative(input.tokenGrant)) throw new Error('TOKEN_GRANT_INVALID')
        if (!validPositive(input.durationDays)) throw new Error('PRODUCT_DURATION_INVALID')

        // `products`/`product_prices` memakai HURUF BESAR (dikunci CHECK
        // constraint `status = upper(status)`), sedangkan nilai dari form huruf
        // kecil — tanpa normalisasi ini simpan produk gagal check_violation.
        const status = input.status.trim().toUpperCase()
        if (!['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(status)) throw new Error('PRODUCT_STATUS_INVALID')

        if (status === 'ACTIVE') {
            const readiness = await productReadiness(catalog.program.code, catalog.track.code, input.productType, input.id || undefined)
            if (!readiness.ready) throw new Error(readiness.reason)
        }

        let productId = input.id ?? null
        if (productId) {
            const { data: current, error: currentError } = await admin
                .from('products')
                .select('id, program_id, track_id')
                .eq('id', productId)
                .maybeSingle()
            if (currentError) throw currentError
            if (!current || !sameId(current.program_id, catalog.program.id) || !sameId(current.track_id, catalog.track.id)) {
                throw new Error('PRODUCT_CATALOG_MISMATCH')
            }
            const { error } = await admin
                .from('products')
                .update({
                    code,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    product_type: input.productType,
                    duration_days: input.durationDays ?? null,
                    status,
                    updated_at: nowIso(),
                })
                .eq('id', productId)
            if (error) throw error
        } else {
            const { data, error } = await admin
                .from('products')
                .insert({
                    code,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    product_type: input.productType,
                    program_id: catalog.program.id,
                    track_id: catalog.track.id,
                    duration_days: input.durationDays ?? null,
                    status,
                })
                .select('id')
                .single()
            if (error) throw error
            productId = String(data.id)
        }

        if (input.price !== null && input.price !== undefined) {
            const { error: deactivateError } = await admin
                .from('product_prices')
                .update({ status: 'INACTIVE', ends_at: nowIso() })
                .eq('product_id', productId)
                .in('status', ['active', 'ACTIVE'])
                .is('ends_at', null)
            if (deactivateError) throw deactivateError

            const { error: priceError } = await admin
                .from('product_prices')
                .insert({
                    product_id: productId,
                    currency: input.currency || 'IDR',
                    amount: input.price,
                    starts_at: nowIso(),
                    ends_at: null,
                    status: 'ACTIVE',
                })
            if (priceError) throw priceError
        }

        const untyped = await createAdminClient()

        // Tipe wallet token mengikuti program produk (CPNS → exam_token_cpns, TKA → exam_token_tka),
        // supaya grant token masuk ke saldo program yang benar.
        const { data: programRow } = await untyped
            .from('programs')
            .select('token_wallet_type')
            .eq('id', catalog.program.id)
            .maybeSingle()
        const programTokenWalletType =
            typeof programRow?.token_wallet_type === 'string' && programRow.token_wallet_type.length > 0
                ? programRow.token_wallet_type
                : DEFAULT_TOKEN_WALLET_TYPE

        if (input.tokenGrant !== null && input.tokenGrant !== undefined) {
            if (input.tokenGrant > 0) {
                const { error } = await untyped
                    .from('product_wallet_grants')
                    .upsert({
                        product_id: productId,
                        wallet_type: programTokenWalletType,
                        amount: input.tokenGrant,
                        config: {},
                    }, { onConflict: 'product_id,wallet_type' })
                if (error) throw error
            } else {
                const { error } = await untyped
                    .from('product_wallet_grants')
                    .delete()
                    .eq('product_id', productId)
                    .eq('wallet_type', programTokenWalletType)
                if (error) throw error
            }
        }

        return productId
    }

    async archiveProduct(productId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('products')
            .update({ status: 'ARCHIVED', updated_at: nowIso() })
            .eq('id', productId)
        if (error) throw error
    }
}

export const adminProductService = new AdminProductService()
