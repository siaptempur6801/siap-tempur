'use client'

import { useState, useCallback, useId } from 'react'
import Cropper from 'react-easy-crop'
import { X } from 'lucide-react'
import DialogSurface from '@/components/ui/DialogSurface'

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

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('No 2d context')

  const outputSize = Math.min(512, pixelCrop.width, pixelCrop.height)
  canvas.width = outputSize
  canvas.height = outputSize

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas is empty'))
      },
      'image/jpeg',
      0.9,
    )
  })
}

interface ImageCropperProps {
  imageSrc: string
  onCancel: () => void
  onCropComplete: (croppedBlob: Blob) => void
}

export default function ImageCropper({ imageSrc, onCancel, onCropComplete }: ImageCropperProps) {
  const titleId = useId()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState('')

  const onCropCompleteHandler = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return

    setProcessingError('')
    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCropComplete(croppedBlob)
    } catch (e) {
      console.error('Cropping error:', e)
      setProcessingError('Foto belum bisa diproses. Coba sesuaikan area foto lalu simpan kembali.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <DialogSurface
      isOpen
      onClose={onCancel}
      dismissible={!isProcessing}
      labelledBy={titleId}
      className="relative flex h-[min(600px,calc(100dvh-2rem))] max-w-xl flex-col overflow-hidden rounded-xl border-4 border-gray-900 bg-white p-0 st-shadow-lg"
    >
      {/* Header */}
      <div className="p-4 bg-yellow-300 border-b-4 border-gray-900 flex justify-between items-center">
        <h3 id={titleId} className="text-2xl font-black text-gray-900">
          SESUAIKAN FOTO
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Tutup pemotong foto"
          data-autofocus
          className="st-focus flex h-11 w-11 items-center justify-center rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-100"
        >
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
        {processingError && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {processingError}
          </p>
        )}
        <div className="flex items-center gap-4">
          <span className="font-black text-gray-900">ZOOM</span>
          <input
            aria-label="Perbesar foto"
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
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-500 text-white font-black border-4 border-gray-900 st-shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
          >
            {isProcessing ? 'PROSES...' : 'SIMPAN FOTO'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-4 bg-white text-gray-900 font-black border-4 border-gray-900 st-shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            BATAL
          </button>
        </div>
      </div>
    </DialogSurface>
  )
}
