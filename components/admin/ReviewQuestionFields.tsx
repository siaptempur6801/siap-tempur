'use client'

import { AdminField, adminInputClass } from '@/components/admin/AdminUi'
import QuestionOptionsEditor from '@/components/admin/QuestionOptionsEditor'
import { useState, type ReactNode } from 'react'

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
export default function ReviewQuestionFields({
  defaultType,
  optionsDefaultValue,
  middle,
}: {
  defaultType?: string
  optionsDefaultValue?: string
  middle: ReactNode
}) {
  const [questionType, setQuestionType] = useState(defaultType || 'single_choice')
  return (
    <>
      <AdminField label="Tipe soal">
        <select
          className={adminInputClass}
          name="question_type"
          value={questionType}
          onChange={(event) => setQuestionType(event.target.value)}
        >
          <option value="single_choice">Pilihan tunggal</option>
          <option value="multiple_choice">Pilihan majemuk</option>
          <option value="category">Kategori</option>
        </select>
      </AdminField>
      {middle}
      <div className="min-w-0 sm:col-span-2">
        <QuestionOptionsEditor defaultValue={optionsDefaultValue} questionType={questionType} />
      </div>
    </>
  )
}
