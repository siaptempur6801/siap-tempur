export interface Question {
    id: string
    content: string
    type: string
    category?: string
    sub_category?: string
    image_url?: string | null
    options: {
        id: string
        content: string
        image_url?: string | null
    }[]
}
