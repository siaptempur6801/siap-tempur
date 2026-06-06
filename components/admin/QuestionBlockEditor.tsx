'use client'

import Image from 'next/image'
import { ArrowDown, ArrowUp, ImageIcon, Plus, Sigma, Space, Trash2, Type } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createQuestionBlockId,
  type QuestionContentBlock,
} from '@/lib/admin-question-blocks'
import RichTextBlockEditor from '@/components/admin/RichTextBlockEditor'
import MathLiveBlockEditor from '@/components/admin/MathLiveBlockEditor'

interface QuestionBlockEditorProps {
  blocks: QuestionContentBlock[]
  onChange: (blocks: QuestionContentBlock[]) => void
  onUploadImage: (file: File, prefix: string) => Promise<string>
  uploadPrefix: string
}

function blockTitle(block: QuestionContentBlock) {
  if (block.type === 'text') return 'Teks'
  if (block.type === 'math') return 'Matematika'
  if (block.type === 'image') return 'Gambar'
  return 'Jarak'
}

export default function QuestionBlockEditor({
  blocks,
  onChange,
  onUploadImage,
  uploadPrefix,
}: QuestionBlockEditorProps) {
  const updateBlock = (id: string, nextBlock: QuestionContentBlock) => {
    onChange(blocks.map(block => block.id === id ? nextBlock : block))
  }

  const addBlock = (type: QuestionContentBlock['type']) => {
    const id = createQuestionBlockId()
    const nextBlock: QuestionContentBlock =
      type === 'text'
        ? { id, type: 'text', text: '' }
        : type === 'math'
          ? { id, type: 'math', latex: '' }
          : type === 'image'
            ? { id, type: 'image', imageUrl: '' }
            : { id, type: 'spacer', size: 'md' }

    onChange([...blocks, nextBlock])
  }

  const removeBlock = (id: string) => {
    const nextBlocks = blocks.filter(block => block.id !== id)
    onChange(nextBlocks.length > 0 ? nextBlocks : [{ id: createQuestionBlockId(), type: 'text', text: '' }])
  }

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return

    const nextBlocks = [...blocks]
    const [block] = nextBlocks.splice(index, 1)
    nextBlocks.splice(direction === 'up' ? index - 1 : index + 1, 0, block)
    onChange(nextBlocks)
  }

  const handleImageFile = async (block: QuestionContentBlock, file: File | undefined) => {
    if (!file || block.type !== 'image') return

    const imageUrl = await onUploadImage(file, uploadPrefix)
    updateBlock(block.id, { ...block, imageUrl })
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <div key={block.id} className="border-2 border-gray-900 bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-gray-300 pb-2">
            <div className="flex items-center gap-2">
              <span className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-900">
                {blockTitle(block)}
              </span>
              <span className="text-xs font-bold text-gray-400">Block #{index + 1}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveBlock(index, 'up')}
                disabled={index === 0}
                className="flex h-8 w-8 items-center justify-center border border-gray-300 bg-white text-gray-500 transition hover:border-gray-900 hover:text-gray-900 disabled:opacity-30"
                title="Naikkan block"
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => moveBlock(index, 'down')}
                disabled={index === blocks.length - 1}
                className="flex h-8 w-8 items-center justify-center border border-gray-300 bg-white text-gray-500 transition hover:border-gray-900 hover:text-gray-900 disabled:opacity-30"
                title="Turunkan block"
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="flex h-8 w-8 items-center justify-center border border-gray-300 bg-white text-gray-500 transition hover:border-gray-900 hover:text-gray-900"
                title="Hapus block"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {block.type === 'text' && (
            <RichTextBlockEditor
              content={block.text}
              onChange={(text) => updateBlock(block.id, { ...block, text })}
              placeholder="Ketik teks soal di sini..."
            />
          )}

          {block.type === 'math' && (
            <MathLiveBlockEditor
              value={block.latex}
              onChange={(latex) => updateBlock(block.id, { ...block, latex })}
            />
          )}

          {block.type === 'image' && (
            <div className="space-y-3">
              {block.imageUrl ? (
                <div className="relative inline-block max-w-sm border-2 border-gray-900 bg-gray-50 p-2">
                  <Image
                    src={block.imageUrl}
                    alt="Preview block gambar"
                    width={480}
                    height={320}
                    unoptimized
                    className="max-h-48 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => updateBlock(block.id, { ...block, imageUrl: '' })}
                    className="absolute -right-3 -top-3 border-2 border-gray-900 bg-gray-900 p-1.5 text-white transition hover:bg-gray-800"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative flex max-w-sm cursor-pointer flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-white px-6 py-8 text-center transition hover:bg-gray-100">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(event) => {
                      void handleImageFile(block, event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                  <div className="mb-4 border-2 border-gray-900 bg-gray-100 p-3 text-gray-900">
                    <ImageIcon size={24} />
                  </div>
                  <p className="font-bold text-gray-900">Upload gambar block</p>
                  <p className="mt-1 text-xs text-gray-500">JPG, PNG, WebP, GIF sampai 2MB</p>
                </div>
              )}
            </div>
          )}

          {block.type === 'spacer' && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={block.size}
                onChange={(event) => updateBlock(block.id, { ...block, size: event.target.value as 'sm' | 'md' | 'lg' })}
                className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none transition focus:border-gray-900 sm:w-44"
              >
                <option value="sm">Kecil</option>
                <option value="md">Sedang</option>
                <option value="lg">Besar</option>
              </select>
              <div
                className={cn(
                  "flex-1 border-2 border-dashed border-gray-300 bg-gray-100",
                  block.size === 'sm' && 'h-2',
                  block.size === 'md' && 'h-6',
                  block.size === 'lg' && 'h-12'
                )}
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Tambah block</span>
        <button type="button" onClick={() => addBlock('text')} className="inline-flex items-center gap-1.5 rounded-md border-2 border-dashed border-gray-400 bg-white px-3 py-2 text-xs font-black text-gray-900 transition hover:border-gray-900 hover:bg-gray-100">
          <Type size={14} /> Teks
        </button>
        <button type="button" onClick={() => addBlock('math')} className="inline-flex items-center gap-1.5 rounded-md border-2 border-dashed border-gray-400 bg-white px-3 py-2 text-xs font-black text-gray-900 transition hover:border-gray-900 hover:bg-gray-100">
          <Sigma size={14} /> Matematika
        </button>
        <button type="button" onClick={() => addBlock('image')} className="inline-flex items-center gap-1.5 rounded-md border-2 border-dashed border-gray-400 bg-white px-3 py-2 text-xs font-black text-gray-900 transition hover:border-gray-900 hover:bg-gray-100">
          <ImageIcon size={14} /> Gambar
        </button>
        <button type="button" onClick={() => addBlock('spacer')} className="inline-flex items-center gap-1.5 rounded-md border-2 border-dashed border-gray-400 bg-white px-3 py-2 text-xs font-black text-gray-900 transition hover:border-gray-900 hover:bg-gray-100">
          <Space size={14} /> Jarak
        </button>
        <Plus size={16} className="text-gray-400" />
      </div>
    </div>
  )
}
