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
                    streak_count: number
                    last_activity_date: string | null
                    created_at: string
                    // New columns
                    phone_number: string | null
                    birth_date: string | null
                    gender: string | null
                    education_level: string | null
                    target_instance: string | null
                    tryout_quota: number
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    streak_count?: number
                    last_activity_date?: string | null
                    created_at?: string
                    // New columns
                    phone_number?: string | null
                    birth_date?: string | null
                    gender?: string | null
                    education_level?: string | null
                    target_instance?: string | null
                    tryout_quota?: number
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    streak_count?: number
                    last_activity_date?: string | null
                    created_at?: string
                    // New columns
                    phone_number?: string | null
                    birth_date?: string | null
                    gender?: string | null
                    education_level?: string | null
                    target_instance?: string | null
                    tryout_quota?: number
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
                    created_at?: string
                }
            }
            test_answers: {
                Row: {
                    id: string
                    session_id: string
                    question_id: string
                    option_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    question_id: string
                    option_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    question_id?: string
                    option_id?: string | null
                    created_at?: string
                }
            }
            // --- NEW GENERIC TABLES --- //
            generic_tests: {
                Row: {
                    id: string
                    title: string
                    category: string
                    description: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    title: string
                    category: string
                    description?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    title?: string
                    category?: string
                    description?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string | null
                }
            }
            generic_questions: {
                Row: {
                    id: string
                    test_id: string
                    content: string
                    image_url: string | null
                    section_name: string
                    type: string
                    explanation: string | null
                    order_index: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    test_id: string
                    content: string
                    image_url?: string | null
                    section_name: string
                    type: string
                    explanation?: string | null
                    order_index?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    test_id?: string
                    content?: string
                    image_url?: string | null
                    section_name?: string
                    type?: string
                    explanation?: string | null
                    order_index?: number
                    created_at?: string
                }
            }
            generic_options: {
                Row: {
                    id: string
                    question_id: string
                    content: string
                    is_correct: boolean
                    score_value: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    question_id: string
                    content: string
                    is_correct?: boolean
                    score_value?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    question_id?: string
                    content?: string
                    is_correct?: boolean
                    score_value?: number
                    created_at?: string
                }
            }
            generic_sessions: {
                Row: {
                    id: string
                    user_id: string
                    test_id: string
                    status: 'in_progress' | 'completed'
                    start_time: string
                    end_time: string | null
                    total_score: number
                    scores_breakdown: Json // The flexible new column
                    is_passed: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    test_id: string
                    status?: 'in_progress' | 'completed'
                    start_time?: string
                    end_time?: string | null
                    total_score?: number
                    scores_breakdown?: Json
                    is_passed?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    test_id?: string
                    status?: 'in_progress' | 'completed'
                    start_time?: string
                    end_time?: string | null
                    total_score?: number
                    scores_breakdown?: Json
                    is_passed?: boolean
                    created_at?: string
                }
            }
            generic_answers: {
                Row: {
                    id: string
                    session_id: string
                    question_id: string
                    option_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    question_id: string
                    option_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    question_id?: string
                    option_id?: string | null
                    created_at?: string
                }
            }
        }
    }
}
