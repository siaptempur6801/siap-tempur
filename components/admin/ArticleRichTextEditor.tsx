'use client'

import { cn } from '@/lib/utils'
import { adminEditorButtonClass } from '@/components/admin/AdminUi'
import { createClient } from '@/lib/utils/supabase/client'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

interface ArticleRichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Hitam', value: '#111827' },
  { label: 'Abu', value: '#4b5563' },
  { label: 'Merah', value: '#ef4444' },
  { label: 'Oranye', value: '#f97316' },
  { label: 'Kuning', value: '#ca8a04' },
  { label: 'Hijau', value: '#16a34a' },
  { label: 'Biru', value: '#2563eb' },
  { label: 'Ungu', value: '#7c3aed' },
  { label: 'Pink', value: '#db2777' },
]

function ToolbarButton({
  onClick,
  isActive,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={cn(
        adminEditorButtonClass,
        isActive ? 'border-primary bg-info-muted text-info' : '',
      )}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-border" />
}

function ColorPicker({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentColor = editor.getAttributes('textStyle').color || ''

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node))
        setIsOpen(false)
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className="md:relative">
      <ToolbarButton
        title="Warna teks"
        isActive={Boolean(currentColor) || isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Palette size={15} />
      </ToolbarButton>
      {isOpen ? (
        <div className="absolute left-2 top-full z-50 mt-2 w-72 max-w-[calc(100%-1rem)] rounded-lg border border-input bg-card p-3 shadow-lg md:left-0 md:w-52 md:max-w-none">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Warna teks
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {TEXT_COLORS.find((color) => color.value === currentColor)?.label || 'Custom'}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {TEXT_COLORS.map((color) => (
              <button
                key={color.label}
                type="button"
                title={color.label}
                aria-label={color.label}
                aria-pressed={currentColor === color.value}
                onClick={() => {
                  if (color.value) editor.chain().focus().setColor(color.value).run()
                  else editor.chain().focus().unsetColor().run()
                  setIsOpen(false)
                }}
                className={cn(
                  adminEditorButtonClass,
                  currentColor === color.value ? 'border-primary ring-2 ring-ring' : '',
                )}
              >
                {color.value ? (
                  <span
                    className="h-5 w-5 rounded-md border border-slate-900/10"
                    style={{ backgroundColor: color.value }}
                  />
                ) : (
                  <RemoveFormatting size={15} />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function LinkButton({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Masukkan URL:', previousUrl)
    if (url === null) return
    if (url === '') return void editor.chain().focus().extendMarkRange('link').unsetLink().run()
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])
  return (
    <ToolbarButton title="Sisipkan tautan" isActive={editor.isActive('link')} onClick={setLink}>
      <LinkIcon size={15} />
    </ToolbarButton>
  )
}

function ImageButton({ editor }: { editor: Editor }) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return void toast.error('Ukuran gambar maksimal 2MB')
    if (!new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).has(file.type))
      return void toast.error('Format gambar harus JPG, PNG, WebP, atau GIF')
    try {
      setIsUploading(true)
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Sesi login tidak valid')
      const fileExt = file.name.split('.').pop() || 'png'
      const fileName = `articles/${user.id}/content-${Date.now()}-${crypto.randomUUID()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(fileName, file)
      if (uploadError) throw new Error(uploadError.message)
      const { data } = supabase.storage.from('article-images').getPublicUrl(fileName)
      editor.chain().focus().setImage({ src: data.publicUrl }).run()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengupload gambar')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg, image/png, image/webp, image/gif"
        className="hidden"
      />
      <ToolbarButton
        title="Upload gambar"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
      </ToolbarButton>
    </>
  )
}

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="relative flex flex-wrap items-center gap-1 border-b border-border bg-muted/80 p-2">
      <ToolbarButton
        title="Paragraf"
        isActive={editor.isActive('paragraph') && !editor.isActive('heading')}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <Pilcrow size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 1"
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={15} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        title="Tebal"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Miring"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Garis bawah"
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Coret"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Sorot"
        isActive={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter size={15} />
      </ToolbarButton>
      <ColorPicker editor={editor} />
      <ToolbarDivider />
      <LinkButton editor={editor} />
      <ImageButton editor={editor} />
      <ToolbarButton
        title="Blockquote"
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={15} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        title="Bullet list"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={15} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        title="Rata kiri"
        isActive={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Rata tengah"
        isActive={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Rata kanan"
        isActive={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight size={15} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        title="Garis horizontal"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Hapus format"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <RemoveFormatting size={15} />
      </ToolbarButton>
      <div className="flex-1" />
      <ToolbarButton
        title="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={15} />
      </ToolbarButton>
    </div>
  )
}

export default function ArticleRichTextEditor({
  content,
  onChange,
  placeholder = 'Mulai menulis artikel...',
}: ArticleRichTextEditorProps) {
  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
    [onChange],
  )

  const extensions = useMemo(
    () => [
      // StarterKit v3 includes Link; keep the explicitly configured extension below
      // as the single source of link behavior and avoid a duplicate-extension warning.
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          class: 'w-full max-h-[420px] rounded-lg border border-border object-cover  my-6',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'font-bold text-info hover:underline' },
      }),
    ],
    [],
  )

  const editor = useEditor({
    extensions,
    content: content || '',
    onUpdate: handleUpdate,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Konten artikel',
        class:
          'admin-content-editor min-h-[400px] max-w-none prose prose-lg prose-slate whitespace-pre-wrap [tab-size:4] bg-card px-5 py-5 text-foreground outline-none sm:px-6 ' +
          '[&_p]:mb-5 [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-3xl [&_h1]:font-semibold ' +
          '[&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold ' +
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_mark]:bg-warning-muted [&_mark]:px-0.5 ' +
          '[&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-info-border [&_blockquote]:bg-info-muted/50 [&_blockquote]:py-2 [&_blockquote]:pl-4 [&_blockquote]:font-semibold [&_img]:h-auto [&_img]:max-w-full',
      },
    },
  })

  useEffect(() => {
    if (!editor || editor.isFocused) return
    const currentHTML = editor.getHTML()
    const normalizedCurrent = currentHTML === '<p></p>' ? '' : currentHTML
    if (normalizedCurrent !== content) editor.commands.setContent(content || '')
  }, [content, editor])

  if (!editor)
    return <div className="min-h-[400px] animate-pulse rounded-lg border border-border bg-muted" />

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-card transition focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      {!content ? (
        <style>{`.tiptap p.is-editor-empty:first-child::before { content: '${placeholder}'; color: #94a3b8; float: left; pointer-events: none; height: 0; }`}</style>
      ) : null}
    </div>
  )
}
