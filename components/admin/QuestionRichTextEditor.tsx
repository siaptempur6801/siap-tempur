'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type Editor, type NodeViewProps } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Node, mergeAttributes } from '@tiptap/core'
import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import { Bold, ImagePlus, Italic, List, ListOrdered, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import FormulaToolbar from '@/components/admin/FormulaToolbar'
import { adminLabelClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { questionTextToEditorHtml } from '@/lib/question-rich-text'
import { QUESTION_IMAGE_ACCEPT } from '@/lib/question-media'
import { uploadQuestionImage } from '@/lib/question-media-client'
import type { LatexSnippet } from '@/lib/latex-snippets'
import { cn } from '@/lib/utils'

/**
 * Editor visual soal (Pertanyaan/Pembahasan/isi opsi).
 *
 * Rumus dan gambar tampil langsung sebagai hasil render — penulis tidak pernah
 * melihat `$...$` atau `[[image:...]]`. Format simpan tetap HTML
 * (`<span data-latex>`, `<div data-latex-block>`, `<img>`), dan renderer
 * (`MathRenderer`) mendukung format itu sekaligus format lama.
 *
 * Dua tata letak:
 *   - penuh (default) untuk Pertanyaan/Pembahasan — label, tombol teks, daftar;
 *   - `compact` untuk isi opsi — tanpa label sendiri (dipakai induk), toolbar
 *     ringkas, dan tinggi satu baris.
 */

function MathInlineView({ node }: NodeViewProps) {
    return (
        <NodeViewWrapper as="span" className="inline-block align-middle">
            <InlineMath math={String(node.attrs.latex ?? '')}/>
        </NodeViewWrapper>
    )
}

function MathBlockView({ node }: NodeViewProps) {
    return (
        <NodeViewWrapper as="div" className="my-2 overflow-x-auto">
            <BlockMath math={String(node.attrs.latex ?? '')}/>
        </NodeViewWrapper>
    )
}

const MathInline = Node.create({
    name: 'mathInline',
    group: 'inline',
    inline: true,
    atom: true,
    addAttributes() {
        return { latex: { default: '' } }
    },
    parseHTML() {
        return [{
            tag: 'span[data-latex]',
            getAttrs: (element) => ({ latex: (element as HTMLElement).getAttribute('data-latex') ?? '' }),
        }]
    },
    renderHTML({ node }) {
        return ['span', mergeAttributes({ 'data-latex': node.attrs.latex })]
    },
    addNodeView() {
        return ReactNodeViewRenderer(MathInlineView)
    },
})

const MathBlock = Node.create({
    name: 'mathBlock',
    group: 'block',
    atom: true,
    addAttributes() {
        return { latex: { default: '' } }
    },
    parseHTML() {
        return [{
            tag: 'div[data-latex-block]',
            getAttrs: (element) => ({ latex: (element as HTMLElement).getAttribute('data-latex-block') ?? '' }),
        }]
    },
    renderHTML({ node }) {
        return ['div', mergeAttributes({ 'data-latex-block': node.attrs.latex })]
    },
    addNodeView() {
        return ReactNodeViewRenderer(MathBlockView)
    },
})

function ToolbarButton({ title, active = false, onClick, children }: {
    title: string
    active?: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border text-slate-600 transition focus:outline-none focus:ring-4 focus:ring-blue-500/10',
                active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900',
            )}
        >
            {children}
        </button>
    )
}

export default function QuestionRichTextEditor({
    name,
    label,
    defaultValue = '',
    onValueChange,
    placeholder,
    hint,
    error,
    fieldId,
    className,
    minHeight,
    editable = true,
    compact = false,
    required = false,
    hiddenInput = true,
}: {
    name: string
    label: string
    defaultValue?: string
    onValueChange?: (html: string) => void
    placeholder?: string
    hint?: string
    error?: string
    fieldId?: string
    className?: string
    minHeight?: string
    /** False = read-only (soal terkunci/approval). */
    editable?: boolean
    /** True = tata letak ringkas untuk isi opsi (tanpa label, toolbar kecil). */
    compact?: boolean
    /** True = form dicegah tersubmit saat konten masih kosong. */
    required?: boolean
    /** False = tidak merender `<input type="hidden" name>`; nilai dibawa field lain (mis. JSON opsi). */
    hiddenInput?: boolean
}) {
    const initialHtml = useMemo(() => questionTextToEditorHtml(defaultValue), [defaultValue])
    const [html, setHtml] = useState(initialHtml)
    const [uploading, setUploading] = useState(false)
    const [missing, setMissing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const editorRef = useRef<Editor | null>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const heightClass = minHeight ?? (compact ? 'min-h-11' : 'min-h-36')

    /**
     * Lapor perubahan untuk aksi programatik (unggah gambar, tombol rumus).
     *
     * `onUpdate` hanya melapor saat editor fokus; aksi lewat tombol/file input
     * tidak selalu memindahkan fokus ke ProseMirror, sehingga tanpa jalur ini
     * form induk menganggap tidak ada perubahan (dirty hilang, JSON opsi tetap
     * kosong).
     */
    function publish() {
        const instance = editorRef.current
        if (!instance?.isEditable) return
        const next = instance.getHTML()
        setHtml(next)
        setMissing(false)
        onValueChange?.(next)
    }

    async function insertImageFromFile(file: File) {
        try {
            setUploading(true)
            const url = await uploadQuestionImage(file)
            const editor = editorRef.current
            if (editor) {
                // `insertContentAt` di ujung seleksi: kursor tetap di tempatnya,
                // tetapi gambar yang sedang terpilih TIDAK ditimpa gambar baru
                // (dua unggahan beruntun sebelumnya saling menggantikan).
                const { from, to } = editor.state.selection
                editor.chain().focus().insertContentAt(from === to ? from : to, { type: 'image', attrs: { src: url, alt: '' } }).run()
                publish()
            }
            toast.success('Gambar diunggah.')
        } catch (uploadError) {
            toast.error(uploadError instanceof Error ? uploadError.message : 'Gagal mengunggah gambar.')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const editor = useEditor({
        immediatelyRender: false,
        editable,
        extensions: [
            StarterKit.configure({ heading: false, codeBlock: false, blockquote: false }),
            Image.configure({ allowBase64: false }),
            MathInline,
            MathBlock,
        ],
        content: initialHtml,
        editorProps: {
            attributes: {
                class: cn('px-3 py-2.5 text-sm font-medium leading-7 text-slate-900 outline-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:my-1 [&_img]:max-w-full', heightClass),
                // Tanpa role eksplisit, Chromium mengekspos div contenteditable
                // sebagai `generic` — pembaca layar dan locator role=textbox
                // (dipakai spec review) tidak menemukannya sebagai field teks.
                role: 'textbox',
                'aria-multiline': 'true',
                'aria-label': label,
            },
        },
        onUpdate: ({ editor: instance }) => {
            const next = instance.getHTML()
            // Nilai tersembunyi selalu disinkronkan, tetapi "perubahan pengguna"
            // hanya dilaporkan saat editor benar-benar fokus & editable —
            // normalisasi dokumen saat mount tidak boleh menandai form dirty
            // (dulu itu memicu dialog konfirmasi sebelum admin mengubah apa pun).
            setHtml(next)
            setMissing(false)
            if (instance.isEditable && instance.isFocused) onValueChange?.(next)
        },
    })

    useEffect(() => {
        editorRef.current = editor ?? null
    }, [editor])

    useEffect(() => {
        editor?.setEditable(editable)
    }, [editor, editable])

    /**
     * Pengganti atribut `required` untuk contenteditable: browser tidak bisa
     * memvalidasi div, jadi form dicegat saat submit. Tanpa ini field `required`
     * di form Review (yang mengandalkan validasi native) kehilangan penjagaannya.
     */
    useEffect(() => {
        if (!required || !editor) return
        const form = rootRef.current?.closest('form')
        if (!form) return
        const guard = (event: SubmitEvent) => {
            if (!editor.isEmpty) return
            event.preventDefault()
            setMissing(true)
            editor.commands.focus()
        }
        form.addEventListener('submit', guard)
        return () => form.removeEventListener('submit', guard)
    }, [required, editor])

    function firstImage(files: FileList | null | undefined) {
        return Array.from(files ?? []).find((candidate) => candidate.type.startsWith('image/'))
    }

    /**
     * Ditangani di fase CAPTURE pada pembungkus editor: ProseMirror juga punya
     * handler drop sendiri, dan handler capture berjalan lebih dulu sehingga
     * berkas gambar tidak "jatuh" sebagai teks.
     */
    function handlePasteCapture(event: React.ClipboardEvent) {
        const file = firstImage(event.clipboardData?.files)
        if (!file) return
        event.preventDefault()
        void insertImageFromFile(file)
    }

    function handleDropCapture(event: React.DragEvent) {
        const file = firstImage(event.dataTransfer?.files)
        if (!file) return
        event.preventDefault()
        void insertImageFromFile(file)
    }

    function insertSnippet(snippet: LatexSnippet) {
        if (!editor) return
        editor.chain().focus().insertContent(snippet.block
            ? { type: 'mathBlock', attrs: { latex: snippet.latex } }
            : { type: 'mathInline', attrs: { latex: snippet.latex } }).run()
        publish()
    }

    const errorId = fieldId && error ? `${fieldId}-error` : undefined
    const hintId = fieldId && hint ? `${fieldId}-hint` : undefined
    const message = error ?? (missing ? 'Wajib diisi sebelum menyimpan.' : undefined)

    return (
        <div ref={rootRef} className={cn('block', compact ? 'space-y-1' : 'space-y-1.5', className)}>
            <input
                ref={fileInputRef}
                type="file"
                accept={QUESTION_IMAGE_ACCEPT}
                className="hidden"
                aria-label={`Unggah gambar untuk ${label.toLowerCase()}`}
                data-upload-target={name}
                onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void insertImageFromFile(file)
                }}
            />
            {!compact ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={adminLabelClass}>{label}</span>
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        aria-label={`Sisipkan gambar ke ${label.toLowerCase()}`}
                        className={adminSecondaryButtonClass}
                    >
                        {uploading ? <Loader2 className="animate-spin" size={15}/> : <ImagePlus size={15}/>}
                        <span>Sisipkan gambar</span>
                    </button>
                </div>
            ) : null}
            {hint ? <span id={hintId} className="block text-xs font-medium leading-5 text-slate-500">{hint}</span> : null}
            <div
                className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10"
                onPasteCapture={handlePasteCapture}
                onDropCapture={handleDropCapture}
            >
                <div className={cn('flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/70', compact ? 'p-1.5' : 'p-2')}>
                    {editor ? (
                        <>
                            <ToolbarButton title="Tebal" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15}/></ToolbarButton>
                            <ToolbarButton title="Miring" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15}/></ToolbarButton>
                            {!compact ? (
                                <>
                                    <ToolbarButton title="Daftar butir" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15}/></ToolbarButton>
                                    <ToolbarButton title="Daftar nomor" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15}/></ToolbarButton>
                                </>
                            ) : null}
                            <div className="mx-1 h-6 w-px bg-slate-200"/>
                        </>
                    ) : null}
                    <FormulaToolbar compact={compact} onInsert={insertSnippet}/>
                    {compact ? (
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            title={`Sisipkan gambar ke ${label.toLowerCase()}`}
                            aria-label={`Sisipkan gambar ke ${label.toLowerCase()}`}
                            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            {uploading ? <Loader2 className="animate-spin" size={13}/> : <ImagePlus size={13}/>}
                        </button>
                    ) : null}
                </div>
                <EditorContent editor={editor}/>
            </div>
            {message ? <span id={errorId} role="alert" className="block text-xs font-bold text-red-700">{message}</span> : null}
            {!compact && placeholder && editor?.isEmpty ? <span className="sr-only">{placeholder}</span> : null}
            {hiddenInput ? <input type="hidden" name={name} value={html}/> : null}
        </div>
    )
}
