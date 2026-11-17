'use client'

import { adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { createV2Client } from '@/lib/utils/supabase/client'
import { Image as ImageIcon,Loader2,Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useRef,useState } from 'react'
import { toast } from 'sonner'

const EVENT_FLYER_BUCKET = 'event-flyers'
const MAX_FILE_SIZE = 4 * 1024 * 1024
const FILE_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}

export default function EventFlyerField({ defaultValue }: { defaultValue?: string | null }) {
    const [flyerUrl, setFlyerUrl] = useState(defaultValue ?? '')
    const [uploading, setUploading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    async function uploadFlyer(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        const extension = FILE_EXTENSIONS[file.type]
        if (!extension) {
            toast.error('Format foto harus JPG, PNG, atau WebP.')
            event.target.value = ''
            return
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error('Ukuran foto event maksimal 4 MB.')
            event.target.value = ''
            return
        }

        try {
            setUploading(true)
            const supabase = createV2Client()
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) throw new Error('Sesi login tidak valid.')

            const path = `${user.id}/event-${Date.now()}-${crypto.randomUUID()}.${extension}`
            const { error: uploadError } = await supabase.storage
                .from(EVENT_FLYER_BUCKET)
                .upload(path, file, { cacheControl: '3600', upsert: false })
            if (uploadError) throw uploadError

            const { data } = supabase.storage.from(EVENT_FLYER_BUCKET).getPublicUrl(path)
            setFlyerUrl(data.publicUrl)
            toast.success('Foto event berhasil diupload.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Foto event gagal diupload.')
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-3 md:col-span-2">
            <input type="hidden" name="flyer_image_url" value={flyerUrl}/>
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Foto / flyer event</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Rasio poster 4:5, JPG/PNG/WebP, maksimal 4 MB.</p>
            </div>

            {flyerUrl ? (
                <div className="relative aspect-[4/5] w-full max-w-48 overflow-hidden rounded-lg border border-border bg-muted">
                    <Image src={flyerUrl} alt="Preview flyer event" fill sizes="192px" className="object-cover"/>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="flex aspect-[4/5] w-full max-w-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted text-sm font-medium text-muted-foreground transition hover:border-slate-400 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {uploading ? <Loader2 size={24} className="animate-spin"/> : <ImageIcon size={24}/>}
                    {uploading ? 'Mengupload...' : 'Pilih foto'}
                </button>
            )}

            <div className="flex flex-wrap gap-2">
                {flyerUrl ? (
                    <>
                        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className={adminSecondaryButtonClass}>
                            {uploading ? <Loader2 size={16} className="animate-spin"/> : <ImageIcon size={16}/>} Ganti foto
                        </button>
                        <button type="button" onClick={() => setFlyerUrl('')} disabled={uploading} className={adminSecondaryButtonClass}>
                            <Trash2 size={16}/> Hapus foto
                        </button>
                    </>
                ) : null}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadFlyer}
                className="hidden"
            />
        </div>
    )
}
