'use client'

import { adminLabelClass,adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import FormulaToolbar from '@/components/admin/FormulaToolbar'
import type { LatexSnippet } from '@/lib/latex-snippets'
import { QUESTION_IMAGE_ACCEPT } from '@/lib/question-media'
import { uploadQuestionImage } from '@/lib/question-media-client'
import { questionTextToEditorHtml } from '@/lib/question-rich-text'
import { cn } from '@/lib/utils'
import { Node,mergeAttributes } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { EditorContent,NodeViewWrapper,ReactNodeViewRenderer,useEditor,type Editor,type NodeViewProps } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import 'katex/dist/katex.min.css'
import { Bold,Check,ImagePlus,Italic,List,ListOrdered,Loader2,Trash2,X } from 'lucide-react'
import { useEffect,useLayoutEffect,useMemo,useRef,useState } from 'react'
import { BlockMath,InlineMath } from 'react-katex'
import { toast } from 'sonner'

/**
 * Editor visual soal (Pertanyaan/Pembahasan/isi opsi).
 *
 * Rumus dan gambar tampil langsung sebagai hasil render — penulis tidak pernah
 * melihat `$...$` atau `[[image:...]]`. Format simpan tetap HTML
 * (`<span data-latex>`, `<div data-latex-block>`, `<img>`), dan renderer
 * (`MathRenderer`) mendukung format itu sekaligus format lama.
 *
 * Rumus adalah node `atom` (tidak bisa diketik langsung seperti teks), jadi
 * **klik rumus membuka editor LaTeX** untuk mengubah isinya; hasilnya langsung
 * dirender ulang. Snippet dari toolbar membawa `autoEdit` sehingga editor
 * LaTeX-nya terbuka otomatis (mis. mengisi placeholder `{}` pada pecahan).
 *
 * Dua tata letak:
 *   - penuh (default) untuk Pertanyaan/Pembahasan — label, tombol teks, daftar;
 *   - `compact` untuk isi opsi — tanpa label sendiri (dipakai induk), toolbar
 *     ringkas, dan tinggi satu baris.
 */

const MATH_ERROR_COLOR = '#dc2626'

function MathEditor({ latex, block, onApply, onCancel, onDelete }: {
    latex: string
    block: boolean
    onApply: (next: string) => void
    onCancel: () => void
    onDelete: () => void
}) {
    const [draft, setDraft] = useState(latex)
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

    useLayoutEffect(() => {
        const element = inputRef.current
        if (!element) return
        element.focus()
        // Kursor diletakkan di placeholder `{}` pertama (mis. `\frac{}{}`) agar
        // penulis bisa langsung mengetik isinya; tanpa placeholder, di akhir.
        const placeholder = latex.indexOf('{}')
        const caret = placeholder >= 0 ? placeholder + 1 : latex.length
        element.setSelectionRange(caret, caret)
    }, [latex])

    const stop = (event: React.SyntheticEvent) => event.stopPropagation()

    return (
        <span
            className={cn(
                'inline-flex flex-wrap items-center gap-1 rounded-lg border border-info-border bg-info-muted/70 p-1 align-middle',
                block && 'w-full flex-col items-stretch',
            )}
            contentEditable={false}
            onMouseDown={stop}
        >
            {block ? (
                <textarea
                    ref={inputRef as React.Ref<HTMLTextAreaElement>}
                    value={draft}
                    rows={2}
                    spellCheck={false}
                    aria-label="LaTeX rumus (blok)"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') { event.preventDefault(); onCancel() }
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); onApply(draft.trim()) }
                    }}
                    className="w-full rounded border border-border px-2 py-1 font-mono text-xs text-foreground"
                />
            ) : (
                <input
                    ref={inputRef as React.Ref<HTMLInputElement>}
                    value={draft}
                    spellCheck={false}
                    aria-label="LaTeX rumus"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') { event.preventDefault(); onApply(draft.trim()) }
                        if (event.key === 'Escape') { event.preventDefault(); onCancel() }
                    }}
                    className="w-44 rounded border border-border px-2 py-1 font-mono text-xs text-foreground"
                />
            )}
            <span className="inline-flex items-center gap-1">
                <button type="button" onClick={() => onApply(draft.trim())} aria-label="Terapkan rumus" title="Terapkan (Enter)" className="flex h-7 w-7 items-center justify-center rounded-md border border-success-border bg-card text-success hover:bg-success-muted"><Check size={14}/></button>
                <button type="button" onClick={onCancel} aria-label="Batal mengubah rumus" title="Batal (Esc)" className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted"><X size={14}/></button>
                <button type="button" onClick={onDelete} aria-label="Hapus rumus" title="Hapus rumus" className="flex h-7 w-7 items-center justify-center rounded-md border border-danger-border bg-card text-red-500 hover:bg-danger-muted"><Trash2 size={14}/></button>
            </span>
            {block ? (
                <span className="block w-full overflow-x-auto rounded bg-card/70 px-2 py-1 text-center text-sm">
                    {draft.trim() ? <BlockMath math={draft} errorColor={MATH_ERROR_COLOR}/> : <span className="text-xs font-semibold text-muted-foreground">Pratinjau rumus tampil di sini.</span>}
                </span>
            ) : null}
        </span>
    )
}

function MathInlineView({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
    const latex = String(node.attrs.latex ?? '')
    const editable = editor.isEditable
    // Snippet baru membawa `autoEdit`; nilai awal state dibaca saat mount agar
    // popover langsung terbuka tanpa setState di dalam efek (aturan lint React).
    const [editing, setEditing] = useState(() => Boolean(node.attrs.autoEdit) && editor.isEditable)
    const autoEdit = Boolean(node.attrs.autoEdit)

    useEffect(() => {
        if (autoEdit) updateAttributes({ autoEdit: false })
    }, [autoEdit, updateAttributes])

    if (editing && editable) {
        return (
            <NodeViewWrapper as="span" className="inline-block align-middle">
                <MathEditor latex={latex} block={false}
                    onApply={(next) => { setEditing(false); editor.commands.focus(); if (next) updateAttributes({ latex: next }); else deleteNode() }}
                    onCancel={() => { setEditing(false); editor.commands.focus() }}
                    onDelete={() => { deleteNode(); editor.commands.focus() }}/>
            </NodeViewWrapper>
        )
    }
    return (
        <NodeViewWrapper as="span" className={cn('inline-block rounded px-0.5 align-middle', editable && 'cursor-pointer hover:bg-info-muted hover:ring-2 hover:ring-blue-200')} title={editable ? 'Klik untuk mengubah rumus' : undefined} onClick={() => { if (editable) setEditing(true) }}>
            <InlineMath math={latex} errorColor={MATH_ERROR_COLOR}/>
        </NodeViewWrapper>
    )
}

function MathBlockView({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
    const latex = String(node.attrs.latex ?? '')
    const editable = editor.isEditable
    const [editing, setEditing] = useState(() => Boolean(node.attrs.autoEdit) && editor.isEditable)
    const autoEdit = Boolean(node.attrs.autoEdit)

    useEffect(() => {
        if (autoEdit) updateAttributes({ autoEdit: false })
    }, [autoEdit, updateAttributes])

    if (editing && editable) {
        return (
            <NodeViewWrapper as="div" className="my-2">
                <MathEditor latex={latex} block
                    onApply={(next) => { setEditing(false); editor.commands.focus(); if (next) updateAttributes({ latex: next }); else deleteNode() }}
                    onCancel={() => { setEditing(false); editor.commands.focus() }}
                    onDelete={() => { deleteNode(); editor.commands.focus() }}/>
            </NodeViewWrapper>
        )
    }
    return (
        <NodeViewWrapper as="div" className={cn('my-2 overflow-x-auto rounded', editable && 'cursor-pointer hover:bg-info-muted hover:ring-2 hover:ring-blue-200')} title={editable ? 'Klik untuk mengubah rumus' : undefined} onClick={() => { if (editable) setEditing(true) }}>
            <BlockMath math={latex} errorColor={MATH_ERROR_COLOR}/>
        </NodeViewWrapper>
    )
}

const MathInline = Node.create({
    name: 'mathInline',
    group: 'inline',
    inline: true,
    atom: true,
    addAttributes() {
        return {
            latex: { default: '' },
            /** Penanda sekali pakai agar editor LaTeX terbuka setelah snippet disisipkan. */
            autoEdit: { default: false, rendered: false },
        }
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
        return {
            latex: { default: '' },
            /** Penanda sekali pakai agar editor LaTeX terbuka setelah snippet disisipkan. */
            autoEdit: { default: false, rendered: false },
        }
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
                'flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition focus:outline-none focus:ring-4 focus:ring-ring/10',
                active ? 'border-info-border bg-info-muted text-info' : 'border-transparent bg-card hover:border-border hover:bg-muted hover:text-foreground',
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
                class: cn('px-3 py-2.5 text-sm font-medium leading-7 text-foreground outline-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:my-1 [&_img]:max-w-full', heightClass),
                // Tanpa role eksplisit, Chromium mengekspos div contenteditable
                // sebagai `generic` — pembaca layar dan locator role=textbox
                // (dipakai spec review) tidak menemukannya sebagai field teks.
                role: 'textbox',
                'aria-multiline': 'true',
                'aria-label': label,
            },
        },
        onUpdate: ({ editor: instance }) => {
            // Nilai tersembunyi selalu disinkronkan; pelaporan ke form induk
            // ditangani efek "reportedRef" di bawah.
            setHtml(instance.getHTML())
            setMissing(false)
        },
    })

    /**
     * Lapor perubahan dokumen ke form induk.
     *
     * Tidak memakai `editor.isFocused`: aksi programatik (unggah gambar, tombol
     * rumus, popover LaTeX) tidak selalu memindahkan fokus ke ProseMirror —
     * dulu perubahan seperti itu tidak terlaporkan sehingga form tidak "dirty"
     * dan JSON opsi tetap kosong. Normalisasi dokumen saat mount disaring
     * dengan mencatat HTML awal sebagai baseline, supaya membuka soal lama
     * tidak langsung menandai form berubah.
     */
    const reportedRef = useRef<string | null>(null)
    useEffect(() => {
        if (!editor) return
        if (reportedRef.current === null) {
            reportedRef.current = editor.getHTML()
            return
        }
        if (!editor.isEditable) return
        const next = editor.getHTML()
        if (next === reportedRef.current) return
        reportedRef.current = next
        onValueChange?.(next)
    }, [editor, html, editable, onValueChange])

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
        // `autoEdit` membuka editor LaTeX node baru supaya placeholder `{}`
        // (mis. `\frac{}{}`) bisa langsung diisi, tanpa klik rumus dulu.
        editor.chain().focus().insertContent(snippet.block
            ? { type: 'mathBlock', attrs: { latex: snippet.latex, autoEdit: true } }
            : { type: 'mathInline', attrs: { latex: snippet.latex, autoEdit: true } }).run()
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
            {hint ? <span id={hintId} className="block text-xs font-medium leading-5 text-muted-foreground">{hint}</span> : null}
            <div
                className="overflow-hidden rounded-lg border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-ring/10"
                onPasteCapture={handlePasteCapture}
                onDropCapture={handleDropCapture}
            >
                <div className={cn('flex flex-wrap items-center gap-1 border-b border-border bg-muted/70', compact ? 'p-1.5' : 'p-2')}>
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
                            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-info-border hover:bg-info-muted hover:text-info focus:outline-none focus:ring-2 focus:ring-ring/20"
                        >
                            {uploading ? <Loader2 className="animate-spin" size={13}/> : <ImagePlus size={13}/>}
                        </button>
                    ) : null}
                </div>
                <EditorContent editor={editor}/>
            </div>
            {message ? <span id={errorId} role="alert" className="block text-xs font-medium text-danger">{message}</span> : null}
            {!compact && placeholder && editor?.isEmpty ? <span className="sr-only">{placeholder}</span> : null}
            {hiddenInput ? <input type="hidden" name={name} value={html}/> : null}
        </div>
    )
}
