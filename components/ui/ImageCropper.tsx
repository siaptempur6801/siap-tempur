'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check } from 'lucide-react'

// Define Area interface locally to avoid type issues
interface Area {
    width: number
    height: number
    x: number
    y: number
}

// --- Utility to create the cropped image blob ---
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous')
        image.src = url
    })

async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area
): Promise<Blob> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) throw new Error('No 2d context')

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    )

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Canvas is empty'))
        }, 'image/jpeg')
    })
}

interface ImageCropperProps {
    imageSrc: string
    onCancel: () => void
    onCropComplete: (croppedBlob: Blob) => void
}

export default function ImageCropper({ imageSrc, onCancel, onCropComplete }: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleSave = async () => {
        if (!croppedAreaPixels) return

        setIsProcessing(true)
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
            onCropComplete(croppedBlob)
        } catch (e) {
            console.error('Cropping error:', e)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4">
            <div className="relative w-full max-w-xl bg-white border-4 border-gray-900 rounded-xl overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[600px]">

                {/* Header */}
                <div className="p-4 bg-yellow-300 border-b-4 border-gray-900 flex justify-between items-center">
                    <h3 className="text-2xl font-black text-gray-900">SESUAIKAN FOTO</h3>
                    <button onClick={onCancel} className="p-1 border-2 border-gray-900 bg-white hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                {/* Cropper - Wrap in div with height */}
                <div className="flex-1 relative bg-gray-200">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={setZoom}
                        cropShape="round"
                        showGrid={false}
                    />
                </div>

                {/* Controls */}
                <div className="p-6 bg-white border-t-4 border-gray-900 space-y-6">
                    <div className="flex items-center gap-4">
                        <span className="font-black text-gray-900">ZOOM</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black border-2 border-gray-900"
                        />
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleSave}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-500 text-white font-black border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                        >
                            {isProcessing ? 'PROSES...' : 'SIMPAN FOTO'}
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={isProcessing}
                            className="px-6 py-4 bg-white text-gray-900 font-black border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                        >
                            BATAL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
