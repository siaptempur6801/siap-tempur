'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextBlockEditorProps {
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
  isActive = false,
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
      className={cn(
        'flex h-8 w-8 items-center justify-center border text-gray-700 transition',
        isActive ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white hover:border-gray-900 hover:bg-gray-100',
        disabled && 'cursor-not-allowed opacity-30'
      )}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-gray-300" />
}

function ColorPicker({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentColor = editor.getAttributes('textStyle').color || ''

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <ToolbarButton
        title="Warna teks"
        isActive={Boolean(currentColor) || isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Palette size={15} />
      </ToolbarButton>

      {isOpen && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-52 -translate-x-1/2 border-2 border-gray-900 bg-white p-2.5 st-shadow-sm">
          <div className="mb-2 flex items-center justify-between border-b border-dashed border-gray-300 pb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Warna Teks</span>
            <span className="text-[10px] font-bold text-gray-500">{TEXT_COLORS.find(color => color.value === currentColor)?.label || 'Custom'}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {TEXT_COLORS.map((color) => (
              <button
                key={color.label}
                type="button"
                title={color.label}
                aria-label={color.label}
                onClick={() => {
                  if (color.value) editor.chain().focus().setColor(color.value).run()
                  else editor.chain().focus().unsetColor().run()
                  setIsOpen(false)
                }}
                className={cn(
                  'flex h-8 w-8 items-center justify-center border-2 bg-white transition hover:-translate-y-0.5 hover:border-gray-900',
                  currentColor === color.value ? 'border-gray-900 st-shadow-sm' : 'border-gray-300'
                )}
              >
                {color.value ? (
                  <span className="h-5 w-5 border border-gray-900/20" style={{ backgroundColor: color.value }} />
                ) : (
                  <RemoveFormatting size={15} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b-2 border-gray-900 bg-gray-100 p-2">
      <ToolbarButton title="Paragraf" isActive={editor.isActive('paragraph') && !editor.isActive('heading')} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow size={15} />
      </ToolbarButton>
      <ToolbarButton title="Heading 1" isActive={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={15} />
      </ToolbarButton>
      <ToolbarButton title="Heading 2" isActive={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={15} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton title="Tebal" isActive={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton title="Miring" isActive={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton title="Garis bawah" isActive={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={15} />
      </ToolbarButton>
      <ToolbarButton title="Coret" isActive={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={15} />
      </ToolbarButton>
      <ToolbarButton title="Sorot" isActive={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Highlighter size={15} />
      </ToolbarButton>
      <ColorPicker editor={editor} />

      <ToolbarDivider />

      <ToolbarButton title="Bullet list" isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton title="Numbered list" isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={15} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton title="Rata kiri" isActive={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft size={15} />
      </ToolbarButton>
      <ToolbarButton title="Rata tengah" isActive={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter size={15} />
      </ToolbarButton>
      <ToolbarButton title="Rata kanan" isActive={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight size={15} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton title="Garis horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={15} />
      </ToolbarButton>
      <ToolbarButton title="Hapus format" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <RemoveFormatting size={15} />
      </ToolbarButton>

      <div className="flex-1" />

      <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={15} />
      </ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={15} />
      </ToolbarButton>
    </div>
  )
}

export default function RichTextBlockEditor({
  content,
  onChange,
  placeholder = 'Ketik teks soal di sini...',
}: RichTextBlockEditorProps) {
  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
    [onChange]
  )

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2] },
    }),
    Highlight.configure({ multicolor: false }),
    TextStyle,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ], [])

  const editor = useEditor({
    extensions,
    content: content || '',
    onUpdate: handleUpdate,
    immediatelyRender: false,
    editorProps: {
      handleKeyDown(view, event) {
        if (event.key === 'Tab') {
          event.preventDefault()
          view.dispatch(view.state.tr.insertText('\t'))
          return true
        }
        return false
      },
      attributes: {
        class:
          'min-h-[132px] whitespace-pre-wrap [tab-size:4] bg-white px-4 py-3 text-gray-900 outline-none ' +
          '[&_p]:my-1 [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-xl [&_h1]:font-black ' +
          '[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-black ' +
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_mark]:bg-yellow-200 [&_mark]:px-0.5',
      },
    },
  })

  useEffect(() => {
    if (!editor || editor.isFocused) return

    const currentHTML = editor.getHTML()
    const normalizedCurrent = currentHTML === '<p></p>' ? '' : currentHTML
    if (normalizedCurrent !== content) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  if (!editor) {
    return <div className="min-h-[180px] animate-pulse border-2 border-gray-300 bg-gray-100" />
  }

  return (
    <div className="overflow-hidden rounded-md border-2 border-gray-300 bg-white focus-within:border-gray-900">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      {!content && (
        <style>{`
          .tiptap p.is-editor-empty:first-child::before {
            content: '${placeholder}';
            color: #6b7280;
            opacity: 0.65;
            float: left;
            pointer-events: none;
            height: 0;
          }
        `}</style>
      )}
    </div>
  )
}
