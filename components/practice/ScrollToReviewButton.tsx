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
            className="flex justify-center items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 transition-all transform hover:-translate-y-1"
        >
            <CheckCircle2 size={18} /> Review Jawaban
        </button>
    )
}
