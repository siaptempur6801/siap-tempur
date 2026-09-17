'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, Loader2 } from 'lucide-react'
import { importQuestionsFromExcel } from '@/app/actions/admin'
import { parseCsvRows } from '@/lib/csv'

interface ParsedQuestion {
    type: 'TWK' | 'TIU' | 'TKP'
    sub_category: string
    content: string
    explanation: string
    image_url?: string // NEW FIELD
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    option_e: string
    correct_answer?: string // A/B/C/D/E for TWK & TIU
    score_a?: number  // For TKP
    score_b?: number
    score_c?: number
    score_d?: number
    score_e?: number
}

const VALID_TYPES = ['TWK', 'TIU', 'TKP']
const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024
const MAX_IMPORT_ROWS = 1000

const VALID_SUB_CATEGORIES: Record<string, string[]> = {
    TWK: ['Nasionalisme', 'Integritas', 'Bela Negara', 'Pilar Negara', 'Bahasa Negara'],
    TIU: ['Analogi', 'Silogisme', 'Analitis', 'Berhitung', 'Deret Angka', 'Perbandingan Kuantitatif', 'Soal Cerita', 'Analogi Figural', 'Ketidaksamaan', 'Serial'],
    TKP: ['Pelayanan Publik', 'Jejaring Kerja', 'Sosial Budaya', 'Teknologi Informasi dan Komunikasi', 'Profesionalisme', 'Anti-Radikalisme'],
}

export default function ExcelImport() {
    const [isOpen, setIsOpen] = useState(false)
    const [parsedData, setParsedData] = useState<ParsedQuestion[]>([])
    const [errors, setErrors] = useState<string[]>([])
    const [fileName, setFileName] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const validateRow = (row: Record<string, unknown>, index: number): { question: ParsedQuestion | null; errors: string[] } => {
        const rowErrors: string[] = []
        const rowNum = index + 2

        const type = String(row['type'] || '').trim().toUpperCase()
        if (!VALID_TYPES.includes(type)) {
            rowErrors.push(`Baris ${rowNum}: type "${type}" tidak valid (harus TWK/TIU/TKP)`)
        }

        const subCategory = String(row['sub_category'] || '').trim()
        if (type && VALID_SUB_CATEGORIES[type] && !VALID_SUB_CATEGORIES[type].includes(subCategory)) {
            rowErrors.push(`Baris ${rowNum}: sub_category "${subCategory}" tidak valid untuk ${type}. Pilihan: ${VALID_SUB_CATEGORIES[type].join(', ')}`)
        }

        const content = String(row['content'] || '').trim()
        if (!content) {
            rowErrors.push(`Baris ${rowNum}: content (soal) kosong`)
        }

        const imageUrl = String(row['image_url'] || '').trim()

        const optionA = String(row['option_a'] || '').trim()
        const optionB = String(row['option_b'] || '').trim()
        const optionC = String(row['option_c'] || '').trim()
        const optionD = String(row['option_d'] || '').trim()
        const optionE = String(row['option_e'] || '').trim()

        if (!optionA || !optionB || !optionC || !optionD || !optionE) {
            rowErrors.push(`Baris ${rowNum}: semua opsi (A-E) harus diisi`)
        }

        const correctAnswer = String(row['correct_answer'] || '').trim().toUpperCase()

        if (type === 'TKP') {
            const scoreA = Number(row['score_a']) || 0
            const scoreB = Number(row['score_b']) || 0
            const scoreC = Number(row['score_c']) || 0
            const scoreD = Number(row['score_d']) || 0
            const scoreE = Number(row['score_e']) || 0
            const scores = [scoreA, scoreB, scoreC, scoreD, scoreE]

            if (scores.every(s => s === 0)) {
                rowErrors.push(`Baris ${rowNum}: TKP harus punya score (1-5) untuk setiap opsi`)
            }

            if (rowErrors.length > 0) return { question: null, errors: rowErrors }

            return {
                question: {
                    type: type as 'TKP',
                    sub_category: subCategory,
                    content,
                    explanation: String(row['explanation'] || '').trim(),
                    image_url: imageUrl || undefined,
                    option_a: optionA,
                    option_b: optionB,

                    option_c: optionC,
                    option_d: optionD,
                    option_e: optionE,
                    score_a: scoreA,
                    score_b: scoreB,
                    score_c: scoreC,
                    score_d: scoreD,
                    score_e: scoreE,
                },
                errors: [],
            }
        } else {
            // TWK / TIU
            if (!['A', 'B', 'C', 'D', 'E'].includes(correctAnswer)) {
                rowErrors.push(`Baris ${rowNum}: correct_answer "${correctAnswer}" tidak valid (harus A/B/C/D/E)`)
            }

            if (rowErrors.length > 0) return { question: null, errors: rowErrors }

            return {
                question: {
                    type: type as 'TWK' | 'TIU',
                    sub_category: subCategory,
                    content,
                    explanation: String(row['explanation'] || '').trim(),
                    image_url: imageUrl || undefined,
                    option_a: optionA,
                    option_b: optionB,
                    option_c: optionC,
                    option_d: optionD,
                    option_e: optionE,
                    correct_answer: correctAnswer,
                },
                errors: [],
            }
        }
    }

    const processFile = useCallback((file: File) => {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setErrors(['File harus berformat .csv'])
            return
        }

        if (file.size > MAX_IMPORT_FILE_SIZE) {
            setErrors(['Ukuran file maksimal 2 MB'])
            return
        }

        setFileName(file.name)
        setResult(null)
        setErrors([])

        file.text()
            .then((text) => {
                const jsonData = parseCsvRows(text)

                if (jsonData.length === 0) {
                    setErrors(['File kosong atau format tidak sesuai'])
                    return
                }

                if (jsonData.length > MAX_IMPORT_ROWS) {
                    setErrors([`Maksimal import ${MAX_IMPORT_ROWS} baris per file`])
                    return
                }

                const allErrors: string[] = []
                const validQuestions: ParsedQuestion[] = []

                jsonData.forEach((row, index) => {
                    const { question, errors: rowErrors } = validateRow(row, index)
                    if (rowErrors.length > 0) {
                        allErrors.push(...rowErrors)
                    }
                    if (question) {
                        validQuestions.push(question)
                    }
                })

                setParsedData(validQuestions)
                setErrors(allErrors)
            })
            .catch(() => {
                setErrors(['Gagal membaca file. Pastikan file adalah .csv yang valid.'])
            })
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processFile(file)
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) processFile(file)
    }, [processFile])

    const handleSubmit = async () => {
        if (parsedData.length === 0) return
        setIsUploading(true)
        setResult(null)

        try {
            const res = await importQuestionsFromExcel(parsedData)
            setResult(res)
            if (res.success) {
                setParsedData([])
                setFileName('')
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        } catch {
            setResult({ success: false, message: 'Terjadi kesalahan saat upload' })
        } finally {
            setIsUploading(false)
        }
    }

    // Summary stats
    const summary = parsedData.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-lg hover:bg-emerald-700 transition font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transform hover:-translate-y-1 active:translate-y-0"
            >
                <FileSpreadsheet size={20} /> Import CSV
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl border-2 border-gray-900 st-shadow-lg p-6 space-y-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="font-display text-2xl font-bold text-gray-900">
                                📊 Import Soal dari CSV
                            </h2>
                            <button
                                onClick={() => { setIsOpen(false); setParsedData([]); setErrors([]); setResult(null) }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Template Download */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800 font-medium mb-2">📋 Format kolom CSV yang diharapkan:</p>
                            <code className="text-[10px] md:text-xs text-blue-700 break-all bg-white p-2 rounded block border border-blue-200">
                                type | sub_category | content | image_url | explanation | option_a | option_b | option_c | option_d | option_e | correct_answer | score_a | score_b | score_c | score_d | score_e
                            </code>
                            <div className="mt-3 text-xs text-blue-800 space-y-1.5">
                                <p>• <strong>image_url:</strong> opsional, isi dengan link publik gambar (jika ada)</p>
                                <p>• <strong>TWK & TIU:</strong> isi <code>correct_answer</code> (A/B/C/D/E), score dikosongkan</p>
                                <p>• <strong>TKP:</strong> kosongkan <code>correct_answer</code>, isi <code>score_a</code> s/d <code>score_e</code> (1–5)</p>
                                <p className="pt-2"><a href="/template_soal_skd.csv" download className="inline-flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-blue-200 font-bold hover:bg-blue-100 transition shadow-sm">⬇️ Download Template</a></p>
                            </div>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                                ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
                        >
                            <Upload className={`mx-auto mb-3 ${isDragging ? 'text-emerald-500' : 'text-gray-400'}`} size={40} />
                            {fileName ? (
                                <p className="text-gray-900 font-bold">{fileName}</p>
                            ) : (
                                <>
                                    <p className="text-gray-600 font-medium">
                                        Drag & drop file <strong>.csv</strong> atau klik untuk memilih
                                    </p>
                                    <p className="text-gray-400 text-sm mt-1">Maksimum ukuran file: 2MB</p>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        {/* Validation Errors */}
                        {errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                                <p className="text-red-800 font-bold flex items-center gap-2 mb-2">
                                    <AlertTriangle size={18} /> {errors.length} Error ditemukan
                                </p>
                                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                                    {errors.slice(0, 20).map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                    {errors.length > 20 && (
                                        <li className="font-bold">...dan {errors.length - 20} error lainnya</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Preview Summary */}
                        {parsedData.length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                <p className="text-emerald-800 font-bold flex items-center gap-2 mb-3">
                                    <CheckCircle size={18} /> {parsedData.length} soal siap diimport
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.entries(summary).map(([type, count]) => (
                                        <div key={type} className="bg-white rounded-lg p-3 border border-emerald-200 text-center">
                                            <p className="text-2xl font-black text-gray-900">{count}</p>
                                            <p className="text-sm text-gray-600 font-medium">{type}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Preview Table */}
                                <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-emerald-200">
                                    <table className="w-full text-xs">
                                        <thead className="bg-emerald-100 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-left">#</th>
                                                <th className="p-2 text-left">Type</th>
                                                <th className="p-2 text-left">Sub-Kategori</th>
                                                <th className="p-2 text-left">Soal (preview)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 30).map((q, i) => (
                                                <tr key={i} className="border-t border-emerald-100">
                                                    <td className="p-2 text-gray-500">{i + 1}</td>
                                                    <td className="p-2">
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${q.type === 'TWK' ? 'bg-blue-100 text-blue-700' :
                                                            q.type === 'TIU' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-amber-100 text-amber-700'
                                                            }`}>{q.type}</span>
                                                    </td>
                                                    <td className="p-2 text-gray-700">{q.sub_category}</td>
                                                    <td className="p-2 text-gray-600 max-w-xs truncate">{q.content}</td>
                                                </tr>
                                            ))}
                                            {parsedData.length > 30 && (
                                                <tr className="border-t border-emerald-100">
                                                    <td colSpan={4} className="p-2 text-center text-gray-500 font-medium">
                                                        ...dan {parsedData.length - 30} soal lainnya
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={isUploading}
                                    className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-lg hover:bg-gray-800 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" /> Mengimport...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={20} /> Import {parsedData.length} Soal ke Database
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Result */}
                        {result && (
                            <div className={`rounded-lg p-4 border ${result.success
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                                }`}>
                                <p className="font-bold flex items-center gap-2">
                                    {result.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                                    {result.message}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
