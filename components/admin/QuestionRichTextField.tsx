'use client'

import { useRef, useState } from 'react'
import QuestionImageButton from '@/components/admin/QuestionImageButton'
import { adminInputClass, adminLabelClass } from '@/components/admin/AdminUi'
import { insertAtSelection, questionImageMarkup } from '@/lib/question-media'
import { cn } from '@/lib/utils'

/**
 * Field teks soal (pertanyaan/pembahasan) dengan tombol sisipkan gambar.
 *
 * Menggantikan `<textarea>` polos agar penulis tidak perlu menempel URL gambar
 * secara manual: gambar diunggah, lalu markup `[[image:url]]` disisipkan tepat
 * di posisi kursor dan dirender `MathRenderer`.
 *
 * Mendukung dua mode: terkendali (`value` + `onValueChange`, dipakai Question
 * Bank yang menyimpan state form) dan tak-terkendali (`defaultValue` + `name`,
 * dipakai form Review yang dirender server).
 */
export default function QuestionRichTextField({
    name,
    label,
    value,
    defaultValue = '',
    onValueChange,
    required = false,
    placeholder,
    hint,
    error,
    fieldId,
    className,
    minHeight = 'min-h-36',
    maxLength = 50000,
}: {
    name: string
    label: string
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    required?: boolean
    placeholder?: string
    hint?: string
    error?: string
    fieldId?: string
    className?: string
    minHeight?: string
    maxLength?: number
}) {
    const [internal, setInternal] = useState(defaultValue)
    const controlled = value !== undefined
    const current = controlled ? value : internal
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    function setValue(next: string) {
        if (!controlled) setInternal(next)
        onValueChange?.(next)
    }

    function insertImage(url: string) {
        const element = textareaRef.current
        const start = element?.selectionStart ?? current.length
        const end = element?.selectionEnd ?? current.length
        const { value: next, cursor } = insertAtSelection(current, start, end, questionImageMarkup(url))
        setValue(next)
        requestAnimationFrame(() => {
            element?.focus()
            element?.setSelectionRange(cursor, cursor)
        })
    }

    const errorId = fieldId && error ? `${fieldId}-error` : undefined
    const hintId = fieldId && hint ? `${fieldId}-hint` : undefined

    return (
        <div className={cn('block space-y-1.5', className)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={adminLabelClass}>{label}</span>
                <QuestionImageButton
                    ariaLabel={`Unggah gambar untuk ${label.toLowerCase()}`}
                    label="Sisipkan gambar"
                    onUploaded={insertImage}
                    testId={name}
                />
            </div>
            {hint ? <span id={hintId} className="block text-xs font-medium leading-5 text-slate-500">{hint}</span> : null}
            <textarea
                ref={textareaRef}
                name={name}
                value={current}
                onChange={(event) => setValue(event.target.value)}
                required={required}
                placeholder={placeholder}
                maxLength={maxLength}
                aria-label={label}
                aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
                aria-invalid={error ? true : undefined}
                className={cn(adminInputClass, minHeight, 'resize-y')}
            />
            {error ? <span id={errorId} role="alert" className="block text-xs font-bold text-red-700">{error}</span> : null}
        </div>
    )
}
