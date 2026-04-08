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


interface Option {
    id: string
    content: string
    image_url?: string | null
    is_correct: boolean
    score_value: number
}

export interface Question {
    id: string
    type: 'TWK' | 'TIU' | 'TKP'
    category: string
    content: string
    explanation: string
    image_url?: string | null
    created_at: string
    options: Option[]
}

export default function QuestionCard({ q }: { q: Question }) {
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
            // For TKP, the "correct" one is the one with highest score (usually 5)
            return [...q.options].sort((a, b) => b.score_value - a.score_value)[0]
        }

        // For others, find is_correct true
        return q.options.find(opt => opt.is_correct)
    }

    const correctAnswer = getCorrectOption()
    const optionLabels = ['A', 'B', 'C', 'D', 'E']

    return (
        <>
            <div className="group bg-white rounded-xl border-2 border-gray-100 hover:border-blue-400 overflow-hidden transition-all hover:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.2)]">
                <div className="p-5">
                    {/* Header: Type & Actions */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2">
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border",
                                q.type === 'TWK' && "bg-red-50 text-red-600 border-red-200",
                                q.type === 'TIU' && "bg-yellow-50 text-yellow-600 border-yellow-200",
                                q.type === 'TKP' && "bg-green-50 text-green-600 border-green-200",
                            )}>
                                {q.type}
                            </span>
                            {q.category && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-tighter">
                                    {q.category}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <Link
                                href={`/cpns/dashboard/admin/edit/${q.id}`}
                                className="p-3 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl sm:rounded-lg transition bg-gray-50 lg:bg-transparent"
                                title="Edit"
                            >
                                <Edit size={20} className="sm:w-[18px] sm:h-[18px]" />
                            </Link>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                disabled={isDeleting}
                                className="p-3 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl sm:rounded-lg transition disabled:opacity-50 bg-gray-50 lg:bg-transparent"
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
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                            <CheckCircle2 size={14} className="text-green-500" />
                            <span>
                                Kunci: <span className="font-bold text-gray-900">
                                    {correctAnswer ? optionLabels[q.options.indexOf(correctAnswer)] : '-'}
                                </span>
                            </span>
                        </div>

                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline"
                        >
                            {expanded ? 'Tutup Detail' : 'Lihat Detail'}
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                {/* Expanded Details */}
                {expanded && (
                    <div className="bg-gray-50 p-5 border-t-2 border-dashed border-gray-200 space-y-4 animate-in slide-in-from-top-2 duration-200">

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
                                                "flex gap-3 items-start p-2 rounded-lg text-sm transition-colors",
                                                isTheCorrectOne ? "bg-green-100 border border-green-200 text-green-900" : "bg-white border border-gray-200 text-gray-600"
                                            )}
                                        >
                                            <span className={cn(
                                                "w-6 h-6 flex items-center justify-center rounded font-bold text-xs flex-shrink-0",
                                                isTheCorrectOne ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
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
                                                        opt.score_value === 5 ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"
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
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                                <MathRenderer text={q.explanation || '-'} />
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="text-[10px] text-gray-300 font-mono pt-2 flex justify-between">
                            <span>ID: {q.id}</span>
                            <span>Dibuat: {new Date(q.created_at).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && mounted && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#fff9c4] border-2 border-gray-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        {/* Tape Effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/10 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

                        <div className="relative z-10 flex flex-col items-center text-center space-y-4 font-handwriting">
                            <div className="w-16 h-16 bg-red-100 border-2 border-red-600 rounded-full flex items-center justify-center mb-2 rotate-3 shadow-md">
                                <Trash2 size={32} className="text-red-600" />
                            </div>

                            <h3 className="text-3xl font-bold text-gray-900">Hapus soal ini?</h3>

                            <p className="text-lg text-gray-700 font-medium leading-relaxed italic">
                                "Tindakan ini permanen dan tidak bisa dibatalkan."
                            </p>

                            <div className="grid grid-cols-2 gap-4 w-full mt-4">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-50 transition font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white border-2 border-gray-900 hover:bg-red-700 transition font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
