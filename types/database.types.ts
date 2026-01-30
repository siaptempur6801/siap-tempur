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
                    email: string | null
                    full_name: string | null
                    role: 'user' | 'admin'
                    subscription_status: 'free' | 'premium'
                    streak_count: number
                    last_activity_date: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    role?: 'user' | 'admin'
                    subscription_status?: 'free' | 'premium'
                    streak_count?: number
                    last_activity_date?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    role?: 'user' | 'admin'
                    subscription_status?: 'free' | 'premium'
                    streak_count?: number
                    last_activity_date?: string | null
                    created_at?: string
                }
            }
            questions: {
                Row: {
                    id: string
                    content: string
                    type: 'TWK' | 'TIU' | 'TKP'
                    category: string | null
                    explanation: string | null
                    difficulty: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    content: string
                    type: 'TWK' | 'TIU' | 'TKP'
                    category?: string | null
                    explanation?: string | null
                    difficulty?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    content?: string
                    type?: 'TWK' | 'TIU' | 'TKP'
                    category?: string | null
                    explanation?: string | null
                    difficulty?: number
                    created_at?: string
                }
            }
            options: {
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
        }
    }
}
