export interface Option {
    id: string
    content: string
    image_url?: string | null
    is_correct: boolean
    score_value: number
}

export interface Question {
    id: string
    content: string
    image_url?: string | null
    explanation: string
    type: string
    category: string
    options: Option[]
}

export interface Answer {
    id: string
    question_id: string
    option_id: string
    questions: Question | Question[]
    selected_option: Option | null
}
