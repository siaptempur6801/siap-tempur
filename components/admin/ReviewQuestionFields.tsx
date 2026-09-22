'use client'

import { useState, type ReactNode } from 'react'
import QuestionOptionsEditor from '@/components/admin/QuestionOptionsEditor'
import { AdminField, adminInputClass } from '@/components/admin/AdminUi'

/**
 * Tipe soal + editor opsi yang berbagi satu state.
 *
 * Masalah yang ditutup: form create/edit Review Queue punya `<select
 * name="question_type">` dan `QuestionOptionsEditor` yang tidak saling tahu,
 * sehingga memilih "Category" tidak memunculkan field `responseGroup` yang
 * wajib — validasi baru muncul setelah submit.
 *
 * `middle` adalah field-field di antara keduanya. Komponen ini mengembalikan
 * FRAGMENT (tanpa pembungkus DOM), jadi anak-anaknya tetap menjadi grid item
 * form induk — urutan dan tata letaknya tidak berubah.
 */
export default function ReviewQuestionFields({ defaultType, optionsDefaultValue, middle }: { defaultType?: string; optionsDefaultValue?: string; middle: ReactNode }) {
    const [questionType, setQuestionType] = useState(defaultType || 'single_choice')
    return (
        <>
            <AdminField label="Tipe soal">
                <select className={adminInputClass} name="question_type" value={questionType} onChange={(event) => setQuestionType(event.target.value)}>
                    <option value="single_choice">Single choice</option>
                    <option value="multiple_choice">Multiple choice</option>
                    <option value="category">Category</option>
                </select>
            </AdminField>
            {middle}
            <QuestionOptionsEditor defaultValue={optionsDefaultValue} questionType={questionType}/>
        </>
    )
}
