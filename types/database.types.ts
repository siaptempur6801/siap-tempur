export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    avatar_url: string | null
                    bio: string | null
                    role: string
                    tryout_quota: number
                    streak_count: number
                    last_activity_date: string | null
                    phone_number: string | null
                    birth_date: string | null
                    gender: 'Laki-laki' | 'Perempuan' | null
                    education_level: string | null
                    target_instance: string | null
                    updated_at: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    role?: string
                    tryout_quota?: number
                    streak_count?: number
                    last_activity_date?: string | null
                    phone_number?: string | null
                    birth_date?: string | null
                    gender?: 'Laki-laki' | 'Perempuan' | null
                    education_level?: string | null
                    target_instance?: string | null
                    updated_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    role?: string
                    tryout_quota?: number
                    streak_count?: number
                    last_activity_date?: string | null
                    phone_number?: string | null
                    birth_date?: string | null
                    gender?: 'Laki-laki' | 'Perempuan' | null
                    education_level?: string | null
                    target_instance?: string | null
                    updated_at?: string | null
                    created_at?: string
                }
            }
            articles: {
                Row: {
                    id: string
                    title: string
                    slug: string
                    excerpt: string | null
                    content: string
                    category: string | null
                    cover_image_url: string | null
                    status: 'draft' | 'published' | 'archived'
                    author_id: string | null
                    published_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    slug: string
                    excerpt?: string | null
                    content: string
                    category?: string | null
                    cover_image_url?: string | null
                    status?: 'draft' | 'published' | 'archived'
                    author_id?: string | null
                    published_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    slug?: string
                    excerpt?: string | null
                    content?: string
                    category?: string | null
                    cover_image_url?: string | null
                    status?: 'draft' | 'published' | 'archived'
                    author_id?: string | null
                    published_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            questions: {
                Row: {
                    id: string
                    question_code: string
                    content: string
                    type: 'TWK' | 'TIU' | 'TKP'
                    category: string | null
                    sub_category: string | null
                    explanation: string | null
                    image_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    question_code?: string
                    content: string
                    type: 'TWK' | 'TIU' | 'TKP'
                    category?: string | null
                    sub_category?: string | null
                    explanation?: string | null
                    image_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    question_code?: string
                    content?: string
                    type?: 'TWK' | 'TIU' | 'TKP'
                    category?: string | null
                    sub_category?: string | null
                    explanation?: string | null
                    image_url?: string | null
                    created_at?: string
                }
            }
            options: {
                Row: {
                    id: string
                    question_id: string
                    content: string
                    image_url: string | null
                    is_correct: boolean
                    score_value: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    question_id: string
                    content: string
                    image_url?: string | null
                    is_correct?: boolean
                    score_value?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    question_id?: string
                    content?: string
                    image_url?: string | null
                    is_correct?: boolean
                    score_value?: number
                    created_at?: string
                }
            }
            test_sessions: {
                Row: {
                    id: string
                    user_id: string
                    mode: 'practice' | 'tryout'
                    status: 'in_progress' | 'completed'
                    start_time: string
                    end_time: string | null
                    score_twk: number
                    score_tiu: number
                    score_tkp: number
                    total_score: number
                    is_passed: boolean
                    current_question_index: number
                    marked_questions: Json
                    last_activity_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    mode?: 'practice' | 'tryout'
                    status?: 'in_progress' | 'completed'
                    start_time?: string
                    end_time?: string | null
                    score_twk?: number
                    score_tiu?: number
                    score_tkp?: number
                    total_score?: number
                    is_passed?: boolean
                    current_question_index?: number
                    marked_questions?: Json
                    last_activity_at?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    mode?: 'practice' | 'tryout'
                    status?: 'in_progress' | 'completed'
                    start_time?: string
                    end_time?: string | null
                    score_twk?: number
                    score_tiu?: number
                    score_tkp?: number
                    total_score?: number
                    is_passed?: boolean
                    current_question_index?: number
                    marked_questions?: Json
                    last_activity_at?: string
                    created_at?: string
                }
            }
            test_answers: {
                Row: {
                    id: string
                    session_id: string
                    question_id: string
                    option_id: string | null
                    option_order: string[] | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    question_id: string
                    option_id?: string | null
                    option_order?: string[] | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    question_id?: string
                    option_id?: string | null
                    option_order?: string[] | null
                    created_at?: string
                }
            }
            transactions: {
                Row: {
                    id: string
                    user_id: string
                    order_id: string
                    amount: number
                    status: 'pending' | 'capture' | 'settlement' | 'expire' | 'cancel' | 'deny' | null
                    package_name: string
                    snap_token: string | null
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    order_id: string
                    amount: number
                    status?: 'pending' | 'capture' | 'settlement' | 'expire' | 'cancel' | 'deny' | null
                    package_name: string
                    snap_token?: string | null
                    created_at?: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    order_id?: string
                    amount?: number
                    status?: 'pending' | 'capture' | 'settlement' | 'expire' | 'cancel' | 'deny' | null
                    package_name?: string
                    snap_token?: string | null
                    created_at?: string
                    updated_at?: string | null
                }
            }
            tryout_configurations: {
                Row: {
                    id: string
                    type: string
                    sub_category: string
                    question_count: number
                    sort_order: number
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    type: string
                    sub_category: string
                    question_count?: number
                    sort_order?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    type?: string
                    sub_category?: string
                    question_count?: number
                    sort_order?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
}
