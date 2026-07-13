type EventCertificatePreviewProps = {
    certificateNumber: string
    previewName?: string
    cacheKey?: string | null
}

export function EventCertificatePreview({ certificateNumber, previewName, cacheKey }: EventCertificatePreviewProps) {
    const params = new URLSearchParams()
    if (previewName) params.set('name', previewName)
    if (cacheKey) params.set('v', cacheKey)
    const query = params.size > 0 ? `?${params.toString()}` : ''

    return (
        <div className="border-4 border-gray-900 bg-[#f5f8fc] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-6">
            {/* Preview uses the exact same server-rendered image that is wrapped into the PDF download. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={`/api/certificates/${encodeURIComponent(certificateNumber)}/preview${query}`}
                alt="Preview sertifikat"
                className="block aspect-[1.414/1] w-full border-[6px] border-blue-950 bg-[#fffdf7] object-contain"
            />
        </div>
    )
}
