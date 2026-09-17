'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Edit, Trash2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { deleteQuestion } from '@/app/actions/admin'
import MathRenderer from '@/components/MathRenderer'
import { ADMIN_BASE_PATH } from '@/lib/admin-dashboard'


interface Option {
    id: string
    content: string
    image_url?: string | null
    is_correct: boolean
    score_value: number
}

export interface Question {
    id: string
    question_code: string
    type: 'TWK' | 'TIU' | 'TKP'
    category: string
    content: string
    explanation: string
    image_url?: string | null
    created_at: string
    options: Option[]
}

export default function QuestionCard({
    q,
    editHref,
}: {
    q: Question
    editHref?: string
}) {
    const [expanded, setExpanded] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await deleteQuestion(q.id)
            if (res.success) {
                toast.success(res.message)
                setShowDeleteModal(false)
            } else {
                toast.error(res.message)
            }
        } catch {
            toast.error('Gagal menghapus soal')
        } finally {
            setIsDeleting(false)
        }
    }

    const getCorrectOption = () => {
        if (!q.options || q.options.length === 0) return null

        if (q.type === 'TKP') {
            return q.options.find((opt) => opt.is_correct)
                || [...q.options].sort((a, b) => b.score_value - a.score_value)[0]
        }

        return q.options.find(opt => opt.is_correct)
    }

    const correctAnswer = getCorrectOption()
    const optionLabels = ['A', 'B', 'C', 'D', 'E']
    const questionCode = q.question_code || q.id

    return (
        <>
            <div className="group overflow-hidden border-2 border-gray-900 bg-white transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.18)]">
                <div className="p-5">
                    {/* Header: Type & Actions */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-wrap gap-2">
                            <span className="border border-gray-900 bg-gray-100 px-3 py-1 font-mono text-xs font-bold text-gray-900">
                                {questionCode}
                            </span>
                            <span className={cn(
                                "border border-gray-900 bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-gray-900",
                            )}>
                                {q.type}
                            </span>
                            {q.category && (
                                <span className="border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-tighter text-gray-600">
                                    {q.category}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <Link
                                href={editHref || `${ADMIN_BASE_PATH}/edit/${q.id}`}
                                className="bg-gray-50 p-3 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 sm:p-2 lg:bg-transparent"
                                title="Edit"
                            >
                                <Edit size={20} className="sm:w-[18px] sm:h-[18px]" />
                            </Link>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                disabled={isDeleting}
                                className="bg-gray-50 p-3 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 sm:p-2 lg:bg-transparent"
                                title="Hapus"
                            >
                                <Trash2 size={20} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                        </div>
                    </div>

                    {/* Question Text & Image */}
                    <div className="mb-4 flex flex-col sm:flex-row gap-4">
                        {q.image_url && (
                            <div className="shrink-0">
                                <Image
                                    src={q.image_url}
                                    alt="Thumbnail Soal"
                                    width={96}
                                    height={96}
                                    unoptimized
                                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                                />
                            </div>
                        )}
                        <div className={cn(
                            "text-gray-900 font-medium text-base sm:text-lg whitespace-pre-wrap leading-relaxed flex-1",
                            !expanded && "line-clamp-2"
                        )}>
                            <MathRenderer text={q.content} />
                        </div>
                    </div>

                    {/* Footer: Toggle & Quick Info */}
                    <div className="flex items-center justify-between border-t pt-3 mt-2">
                        <div className="flex items-center gap-2 border border-gray-300 bg-gray-50 px-3 py-1 text-sm text-gray-600">
                            <CheckCircle2 size={14} className="text-gray-700" />
                            <span>
                                Kunci: <span className="font-bold text-gray-900">
                                    {correctAnswer ? optionLabels[q.options.indexOf(correctAnswer)] : '-'}
                                </span>
                            </span>
                        </div>

                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-1 text-sm font-bold text-gray-900 hover:underline"
                        >
                            {expanded ? 'Tutup Detail' : 'Lihat Detail'}
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                {/* Expanded Details */}
                {expanded && (
                    <div className="space-y-4 border-t-2 border-dashed border-gray-300 bg-gray-50 p-5 animate-in slide-in-from-top-2 duration-200">

                        {/* Options List */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pilihan Jawaban</p>
                            <div className="grid gap-2">
                                {q.options?.map((opt, idx) => {
                                    const isTheCorrectOne = correctAnswer && opt.id === correctAnswer.id;
                                    return (
                                        <div
                                            key={opt.id}
                                            className={cn(
                                                "flex gap-3 items-start border p-2 text-sm transition-colors",
                                                isTheCorrectOne ? "border-gray-900 bg-gray-100 text-gray-900" : "border-gray-200 bg-white text-gray-600"
                                            )}
                                        >
                                            <span className={cn(
                                                "flex h-6 w-6 flex-shrink-0 items-center justify-center text-xs font-bold",
                                                isTheCorrectOne ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {optionLabels[idx] || '?'}
                                            </span>
                                            <div className="flex-1 flex justify-between items-start gap-2">
                                                <div className="flex-1 space-y-2">
                                                    {opt.image_url && (
                                                        <Image
                                                            src={opt.image_url}
                                                            alt={`Pilihan ${optionLabels[idx] || '?'}`}
                                                            width={320}
                                                            height={220}
                                                            unoptimized
                                                            className="max-h-36 w-full max-w-xs object-contain rounded-lg border border-gray-200 bg-white"
                                                        />
                                                    )}
                                                    {opt.content.trim() && <MathRenderer text={opt.content} />}
                                                </div>
                                                {q.type === 'TKP' && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold shrink-0",
                                                        opt.score_value === 5 ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-600"
                                                    )}>
                                                        {opt.score_value} Poin
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Discussion */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pembahasan</p>
                            <div className="border border-gray-300 bg-white p-4 text-sm leading-relaxed text-gray-900">
                                <MathRenderer text={q.explanation || '-'} />
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="text-[10px] text-gray-300 font-mono pt-2 flex justify-between">
                            <span>{questionCode}</span>
                            <span>Dibuat: {new Date(q.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && mounted && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-sm animate-in overflow-hidden border-2 border-gray-900 bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] duration-200 zoom-in-95">
                        {/* Tape Effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/10 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

                        <div className="relative z-10 flex flex-col items-center text-center space-y-4 font-display">
                            <div className="mb-2 flex h-16 w-16 rotate-3 items-center justify-center border-2 border-gray-900 bg-gray-100 shadow-md">
                                <Trash2 size={32} className="text-gray-900" />
                            </div>

                            <h3 className="text-3xl font-bold text-gray-900">Hapus soal ini?</h3>

                            <p className="text-lg text-gray-700 font-medium leading-relaxed italic">
                                "Tindakan ini permanen dan tidak bisa dibatalkan."
                            </p>

                            <div className="grid grid-cols-2 gap-4 w-full mt-4">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="rounded-md border-2 border-gray-900 bg-white px-4 py-2 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:bg-gray-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-2 font-bold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:bg-gray-800 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isDeleting ? '...' : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
