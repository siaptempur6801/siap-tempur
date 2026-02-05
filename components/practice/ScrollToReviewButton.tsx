'use client'

import { CheckCircle2 } from 'lucide-react'

export default function ScrollToReviewButton() {
    const scrollToReview = () => {
        const element = document.getElementById('review-section')
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <button
            onClick={scrollToReview}
            className="flex justify-center items-center gap-3 px-8 py-4 rounded-2xl bg-gray-900 text-white font-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:bg-gray-800 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
            <CheckCircle2 size={24} /> Review Jawaban
        </button>
    )
}
