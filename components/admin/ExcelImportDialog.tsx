'use client'

import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { importQuestionsFromExcel } from '@/app/actions/admin'
import { parseCsvRows } from '@/lib/csv'
import Modal from '@/components/ui/Modal'

interface ParsedQuestion {
    type: 'TWK' | 'TIU' | 'TKP'
    sub_category: string
    content: string
    explanation: string
    image_url?: string
    option_a: string
    option_a_image_url?: string
    option_b: string
    option_b_image_url?: string
    option_c: string
    option_c_image_url?: string
    option_d: string
    option_d_image_url?: string
    option_e: string
    option_e_image_url?: string
    correct_answer?: string
    score_a?: number
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

function readCell(row: Record<string, unknown>, key: string) {
    return String(row[key] || '').trim()
}

function countOptionImages(question: ParsedQuestion) {
    return [
        question.option_a_image_url,
        question.option_b_image_url,
        question.option_c_image_url,
        question.option_d_image_url,
        question.option_e_image_url,
    ].filter(Boolean).length
}

export default function ExcelImportDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [parsedData, setParsedData] = useState<ParsedQuestion[]>([])
    const [errors, setErrors] = useState<string[]>([])
    const [fileName, setFileName] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const validateRow = (
        row: Record<string, unknown>,
        index: number
    ): { question: ParsedQuestion | null; errors: string[] } => {
        const rowErrors: string[] = []
        const rowNum = index + 2

        const type = readCell(row, 'type').toUpperCase()
        if (!VALID_TYPES.includes(type)) {
            rowErrors.push(`Baris ${rowNum}: type "${type}" tidak valid (harus TWK/TIU/TKP)`)
        }

        const subCategory = readCell(row, 'sub_category')
        if (type && VALID_SUB_CATEGORIES[type] && !VALID_SUB_CATEGORIES[type].includes(subCategory)) {
            rowErrors.push(
                `Baris ${rowNum}: sub_category "${subCategory}" tidak valid untuk ${type}. Pilihan: ${VALID_SUB_CATEGORIES[type].join(', ')}`
            )
        }

        const content = readCell(row, 'content')
        if (!content) {
            rowErrors.push(`Baris ${rowNum}: content (soal) kosong`)
        }

        const explanation = readCell(row, 'explanation')
        const imageUrl = readCell(row, 'image_url')

        const optionA = readCell(row, 'option_a')
        const optionAImageUrl = readCell(row, 'option_a_image_url')
        const optionB = readCell(row, 'option_b')
        const optionBImageUrl = readCell(row, 'option_b_image_url')
        const optionC = readCell(row, 'option_c')
        const optionCImageUrl = readCell(row, 'option_c_image_url')
        const optionD = readCell(row, 'option_d')
        const optionDImageUrl = readCell(row, 'option_d_image_url')
        const optionE = readCell(row, 'option_e')
        const optionEImageUrl = readCell(row, 'option_e_image_url')

        const options = [
            { label: 'A', text: optionA, imageUrl: optionAImageUrl },
            { label: 'B', text: optionB, imageUrl: optionBImageUrl },
            { label: 'C', text: optionC, imageUrl: optionCImageUrl },
            { label: 'D', text: optionD, imageUrl: optionDImageUrl },
            { label: 'E', text: optionE, imageUrl: optionEImageUrl },
        ]

        const emptyOptions = options.filter((option) => !option.text && !option.imageUrl)
        if (emptyOptions.length > 0) {
            rowErrors.push(
                `Baris ${rowNum}: opsi ${emptyOptions.map((option) => option.label).join(', ')} harus punya teks atau image URL`
            )
        }

        const correctAnswer = readCell(row, 'correct_answer').toUpperCase()

        if (type === 'TKP') {
            const scoreA = Number(row['score_a']) || 0
            const scoreB = Number(row['score_b']) || 0
            const scoreC = Number(row['score_c']) || 0
            const scoreD = Number(row['score_d']) || 0
            const scoreE = Number(row['score_e']) || 0
            const scores = [scoreA, scoreB, scoreC, scoreD, scoreE]

            if (scores.some((score) => score < 0 || score > 5)) {
                rowErrors.push(`Baris ${rowNum}: score TKP harus di rentang 1-5`)
            }

            if (scores.every((score) => score === 0)) {
                rowErrors.push(`Baris ${rowNum}: TKP harus punya score (1-5) untuk setiap opsi`)
            }

            if (correctAnswer && !['A', 'B', 'C', 'D', 'E'].includes(correctAnswer)) {
                rowErrors.push(`Baris ${rowNum}: correct_answer "${correctAnswer}" tidak valid (harus A/B/C/D/E)`)
            }

            if (rowErrors.length > 0) {
                return { question: null, errors: rowErrors }
            }

            return {
                question: {
                    type: 'TKP',
                    sub_category: subCategory,
                    content,
                    explanation,
                    image_url: imageUrl || undefined,
                    option_a: optionA,
                    option_a_image_url: optionAImageUrl || undefined,
                    option_b: optionB,
                    option_b_image_url: optionBImageUrl || undefined,
                    option_c: optionC,
                    option_c_image_url: optionCImageUrl || undefined,
                    option_d: optionD,
                    option_d_image_url: optionDImageUrl || undefined,
                    option_e: optionE,
                    option_e_image_url: optionEImageUrl || undefined,
                    correct_answer: correctAnswer || undefined,
                    score_a: scoreA,
                    score_b: scoreB,
                    score_c: scoreC,
                    score_d: scoreD,
                    score_e: scoreE,
                },
                errors: [],
            }
        }

        if (!['A', 'B', 'C', 'D', 'E'].includes(correctAnswer)) {
            rowErrors.push(`Baris ${rowNum}: correct_answer "${correctAnswer}" tidak valid (harus A/B/C/D/E)`)
        }

        if (rowErrors.length > 0) {
            return { question: null, errors: rowErrors }
        }

        return {
            question: {
                type: type as 'TWK' | 'TIU',
                sub_category: subCategory,
                content,
                explanation,
                image_url: imageUrl || undefined,
                option_a: optionA,
                option_a_image_url: optionAImageUrl || undefined,
                option_b: optionB,
                option_b_image_url: optionBImageUrl || undefined,
                option_c: optionC,
                option_c_image_url: optionCImageUrl || undefined,
                option_d: optionD,
                option_d_image_url: optionDImageUrl || undefined,
                option_e: optionE,
                option_e_image_url: optionEImageUrl || undefined,
                correct_answer: correctAnswer,
            },
            errors: [],
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

                const nextErrors: string[] = []
                const validQuestions: ParsedQuestion[] = []

                jsonData.forEach((row, index) => {
                    const { question, errors: rowErrors } = validateRow(row, index)
                    if (rowErrors.length > 0) {
                        nextErrors.push(...rowErrors)
                    }
                    if (question) {
                        validQuestions.push(question)
                    }
                })

                setParsedData(validQuestions)
                setErrors(nextErrors)
            })
            .catch(() => {
                setErrors(['Gagal membaca file. Pastikan file adalah .csv yang valid.'])
            })
    }, [])

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            processFile(file)
        }
    }

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files?.[0]
        if (file) {
            processFile(file)
        }
    }, [processFile])

    const handleClose = () => {
        setIsOpen(false)
        setParsedData([])
        setErrors([])
        setResult(null)
    }

    const handleSubmit = async () => {
        if (parsedData.length === 0) return

        setIsUploading(true)
        setResult(null)

        try {
            const response = await importQuestionsFromExcel(parsedData)
            setResult(response)
            if (response.success) {
                setParsedData([])
                setFileName('')
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
            }
        } catch {
            setResult({ success: false, message: 'Terjadi kesalahan saat upload' })
        } finally {
            setIsUploading(false)
        }
    }

    const summary = parsedData.reduce((acc, question) => {
        acc[question.type] = (acc[question.type] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 rounded-md border-2 border-gray-900 bg-white px-5 py-3 font-bold text-gray-900 st-shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
            >
                <FileSpreadsheet size={20} />
                Import CSV
            </button>

            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title="Import Soal dari CSV"
                className="max-w-3xl"
            >
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <p className="mb-2 text-sm font-medium text-blue-800">Format kolom CSV yang didukung:</p>
                            <code className="block break-all rounded border border-blue-200 bg-white p-2 text-[10px] text-blue-700 md:text-xs">
                                type | sub_category | content | image_url | explanation | option_a | option_a_image_url | option_b | option_b_image_url | option_c | option_c_image_url | option_d | option_d_image_url | option_e | option_e_image_url | correct_answer | score_a | score_b | score_c | score_d | score_e
                            </code>
                            <div className="mt-3 space-y-1.5 text-xs text-blue-800">
                                <p>- `image_url` opsional untuk gambar soal.</p>
                                <p>- `option_*_image_url` opsional untuk gambar opsi. Opsi boleh teks saja, gambar saja, atau keduanya.</p>
                                <p>- TWK dan TIU wajib isi `correct_answer` dengan `A/B/C/D/E`.</p>
                                <p>- TKP wajib isi `score_a` sampai `score_e` dengan nilai 1-5. `correct_answer` boleh dikosongkan.</p>
                                <p className="pt-2">
                                    <a
                                        href="/template_soal_skd.csv"
                                        download
                                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 font-bold transition hover:bg-blue-100"
                                    >
                                        Download Template
                                    </a>
                                </p>
                            </div>
                        </div>

                        <div
                            onDragOver={(event) => {
                                event.preventDefault()
                                setIsDragging(true)
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                                isDragging
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            <Upload
                                className={`mx-auto mb-3 ${isDragging ? 'text-emerald-500' : 'text-gray-400'}`}
                                size={40}
                            />
                            {fileName ? (
                                <p className="font-bold text-gray-900">{fileName}</p>
                            ) : (
                                <>
                                    <p className="font-medium text-gray-600">
                                        Drag & drop file <strong>.csv</strong> atau klik untuk memilih
                                    </p>
                                    <p className="mt-1 text-sm text-gray-400">Maksimum ukuran file: 2MB</p>
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

                        {errors.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-4">
                                <p className="mb-2 flex items-center gap-2 font-bold text-red-800">
                                    <AlertTriangle size={18} />
                                    {errors.length} error ditemukan
                                </p>
                                <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                                    {errors.slice(0, 20).map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                    {errors.length > 20 ? (
                                        <li className="font-bold">...dan {errors.length - 20} error lainnya</li>
                                    ) : null}
                                </ul>
                            </div>
                        ) : null}

                        {parsedData.length > 0 ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                <p className="mb-3 flex items-center gap-2 font-bold text-emerald-800">
                                    <CheckCircle size={18} />
                                    {parsedData.length} soal siap diimport
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.entries(summary).map(([type, count]) => (
                                        <div
                                            key={type}
                                            className="rounded-lg border border-emerald-200 bg-white p-3 text-center"
                                        >
                                            <p className="text-2xl font-black text-gray-900">{count}</p>
                                            <p className="text-sm font-medium text-gray-600">{type}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-emerald-200">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-emerald-100">
                                            <tr>
                                                <th className="p-2 text-left">#</th>
                                                <th className="p-2 text-left">Type</th>
                                                <th className="p-2 text-left">Sub-Kategori</th>
                                                <th className="p-2 text-left">Soal</th>
                                                <th className="p-2 text-left">Opsi Gambar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 30).map((question, index) => (
                                                <tr key={index} className="border-t border-emerald-100">
                                                    <td className="p-2 text-gray-500">{index + 1}</td>
                                                    <td className="p-2">
                                                        <span
                                                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                                question.type === 'TWK'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : question.type === 'TIU'
                                                                        ? 'bg-blue-100 text-blue-700'
                                                                        : 'bg-amber-100 text-amber-700'
                                                            }`}
                                                        >
                                                            {question.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-gray-700">{question.sub_category}</td>
                                                    <td className="max-w-xs truncate p-2 text-gray-600">{question.content}</td>
                                                    <td className="p-2 text-gray-600">{countOptionImages(question)}</td>
                                                </tr>
                                            ))}
                                            {parsedData.length > 30 ? (
                                                <tr className="border-t border-emerald-100">
                                                    <td colSpan={5} className="p-2 text-center font-medium text-gray-500">
                                                        ...dan {parsedData.length - 30} soal lainnya
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={isUploading}
                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            Mengimport...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={20} />
                                            Import {parsedData.length} soal ke database
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : null}

                        {result ? (
                            <div
                                className={`rounded-lg border p-4 ${
                                    result.success
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                        : 'border-red-200 bg-red-50 text-red-800'
                                }`}
                            >
                                <p className="flex items-center gap-2 font-bold">
                                    {result.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                                    {result.message}
                                </p>
                            </div>
                        ) : null}
            </Modal>
        </>
    )
}
