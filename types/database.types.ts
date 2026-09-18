/*
 * Schema V2 type snapshot.
 * Source: Supabase project lpgrivowdcepcxradavu (Siap Tempur Staging).
 * Generated/verified on 2026-08-20.
 *
 * Canonical tables already used by migrated runtime domains are strongly typed
 * below. Tables not migrated yet intentionally remain GenericTable. Run
 * `npm run db:types:staging` with an authenticated Supabase CLI to replace this
 * snapshot with the complete generated relationship metadata before cutover.
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

type GenericRow = Record<string, unknown>
type GenericTable = {
    Row: GenericRow
    Insert: GenericRow
    Update: GenericRow
    Relationships: []
}

type ProfilesTable = {
    Row: {
        id: string
        full_name: string
        display_name: string | null
        avatar_url: string | null
        phone: string | null
        birth_date: string | null
        gender: string | null
        bio: string | null
        education_level: string | null
        target_instance: string | null
        onboarding_completed: boolean
        status: string
        created_at: string
        updated_at: string
    }
    Insert: {
        id: string
        full_name: string
        display_name?: string | null
        avatar_url?: string | null
        phone?: string | null
        birth_date?: string | null
        gender?: string | null
        bio?: string | null
        education_level?: string | null
        target_instance?: string | null
        onboarding_completed?: boolean
        status?: string
        created_at?: string
        updated_at?: string
    }
    Update: Partial<ProfilesTable['Insert']>
    Relationships: []
}

type RolesTable = {
    Row: { id: string; code: string; name: string; description: string | null }
    Insert: { id?: string; code: string; name: string; description?: string | null }
    Update: Partial<RolesTable['Insert']>
    Relationships: []
}

type PermissionsTable = {
    Row: { id: string; code: string; name: string; description: string | null }
    Insert: { id?: string; code: string; name: string; description?: string | null }
    Update: Partial<PermissionsTable['Insert']>
    Relationships: []
}

type RolePermissionsTable = {
    Row: { role_id: string; permission_id: string }
    Insert: { role_id: string; permission_id: string }
    Update: Partial<RolePermissionsTable['Insert']>
    Relationships: []
}

type UserRolesTable = {
    Row: {
        id: string
        user_id: string
        role_id: string
        scope_type: string | null
        scope_id: string | null
        created_at: string
    }
    Insert: {
        id?: string
        user_id: string
        role_id: string
        scope_type?: string | null
        scope_id?: string | null
        created_at?: string
    }
    Update: Partial<UserRolesTable['Insert']>
    Relationships: []
}

type ProgramsTable = {
    Row: {
        id: string
        code: string
        name: string
        slug: string
        description: string | null
        status: string
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        code: string
        name: string
        slug: string
        description?: string | null
        status?: string
        created_at?: string
        updated_at?: string
    }
    Update: Partial<ProgramsTable['Insert']>
    Relationships: []
}

type TracksTable = {
    Row: {
        id: string
        program_id: string
        code: string
        name: string
        slug: string
        description: string | null
        level_order: number
        status: string
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        program_id: string
        code: string
        name: string
        slug: string
        description?: string | null
        level_order?: number
        status?: string
        created_at?: string
        updated_at?: string
    }
    Update: Partial<TracksTable['Insert']>
    Relationships: []
}

type SubjectsTable = {
    Row: {
        id: string
        track_id: string
        code: string
        name: string
        slug: string
        subject_type: string
        sort_order: number
        status: string
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        track_id: string
        code: string
        name: string
        slug: string
        subject_type?: string
        sort_order?: number
        status?: string
        created_at?: string
        updated_at?: string
    }
    Update: Partial<SubjectsTable['Insert']>
    Relationships: []
}

type UserTracksTable = {
    Row: {
        id: string
        user_id: string
        track_id: string
        target_year: number | null
        status: string
        started_at: string
        completed_at: string | null
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        user_id: string
        track_id: string
        target_year?: number | null
        status?: string
        started_at?: string
        completed_at?: string | null
        created_at?: string
        updated_at?: string
    }
    Update: Partial<UserTracksTable['Insert']>
    Relationships: []
}

type UserTrackPreferencesTable = {
    Row: {
        id: string
        user_track_id: string
        target_institution: string | null
        target_position: string | null
        target_university: string | null
        target_major: string | null
        school_name: string | null
        school_grade: string | null
        preferences: Json
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        user_track_id: string
        target_institution?: string | null
        target_position?: string | null
        target_university?: string | null
        target_major?: string | null
        school_name?: string | null
        school_grade?: string | null
        preferences?: Json
        created_at?: string
        updated_at?: string
    }
    Update: Partial<UserTrackPreferencesTable['Insert']>
    Relationships: []
}

type KnowledgeNodesTable = {
    Row: {
        id: string
        subject_id: string
        parent_id: string | null
        code: string | null
        name: string
        slug: string
        node_type: string
        description: string | null
        depth: number
        sort_order: number
        status: string
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        subject_id: string
        parent_id?: string | null
        code?: string | null
        name: string
        slug: string
        node_type?: string
        description?: string | null
        depth?: number
        sort_order?: number
        status?: string
        created_at?: string
        updated_at?: string
    }
    Update: Partial<KnowledgeNodesTable['Insert']>
    Relationships: []
}

type KnowledgeNodePathsTable = {
    Row: { ancestor_id: string; descendant_id: string; depth: number }
    Insert: { ancestor_id: string; descendant_id: string; depth: number }
    Update: Partial<KnowledgeNodePathsTable['Insert']>
    Relationships: []
}

type QuestionsTable = {
    Row: {
        id: string
        question_code: string
        program_id: string
        track_id: string
        subject_id: string
        question_type: string
        stem: string
        difficulty: string
        cognitive_level: string | null
        source_type: string
        source_reference: string | null
        estimated_seconds: number | null
        status: string
        version: number
        author_id: string
        reviewer_id: string | null
        published_at: string | null
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        question_code: string
        program_id: string
        track_id: string
        subject_id: string
        question_type?: string
        stem: string
        difficulty?: string
        cognitive_level?: string | null
        source_type?: string
        source_reference?: string | null
        estimated_seconds?: number | null
        status?: string
        version?: number
        author_id: string
        reviewer_id?: string | null
        published_at?: string | null
        created_at?: string
        updated_at?: string
    }
    Update: Partial<QuestionsTable['Insert']>
    Relationships: []
}

type QuestionKnowledgeNodesTable = {
    Row: { question_id: string; knowledge_node_id: string; relation_type: string }
    Insert: { question_id: string; knowledge_node_id: string; relation_type?: string }
    Update: Partial<QuestionKnowledgeNodesTable['Insert']>
    Relationships: []
}

type QuestionOptionsTable = {
    Row: {
        id: string
        question_id: string
        option_key: string
        content: string
        is_correct: boolean | null
        score: number | null
        sort_order: number
        created_at: string
    }
    Insert: {
        id?: string
        question_id: string
        option_key: string
        content: string
        is_correct?: boolean | null
        score?: number | null
        sort_order?: number
        created_at?: string
    }
    Update: Partial<QuestionOptionsTable['Insert']>
    Relationships: []
}

type QuestionExplanationsTable = {
    Row: {
        id: string
        question_id: string
        version: number
        content: string
        format: string
        video_url: string | null
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        question_id: string
        version?: number
        content: string
        format?: string
        video_url?: string | null
        created_at?: string
        updated_at?: string
    }
    Update: Partial<QuestionExplanationsTable['Insert']>
    Relationships: []
}

type ExamTypesTable = {
    Row: { id: string; code: string; name: string; description: string | null }
    Insert: { id?: string; code: string; name: string; description?: string | null }
    Update: Partial<ExamTypesTable['Insert']>
    Relationships: []
}

type ExamsTable = {
    Row: {
        id: string
        program_id: string
        track_id: string
        period_id: string | null
        exam_type_id: string
        exam_rule_id: string | null
        blueprint_id: string | null
        title: string
        slug: string
        description: string | null
        duration_seconds: number | null
        attempt_limit: number | null
        question_order: string
        result_visibility: string
        access_type: string
        status: string
        starts_at: string | null
        ends_at: string | null
        created_by: string
        created_at: string
        updated_at: string
        required_feature_id: string | null
        token_cost: number
    }
    Insert: {
        id?: string
        program_id: string
        track_id: string
        period_id?: string | null
        exam_type_id: string
        exam_rule_id?: string | null
        blueprint_id?: string | null
        title: string
        slug: string
        description?: string | null
        duration_seconds?: number | null
        attempt_limit?: number | null
        question_order?: string
        result_visibility?: string
        access_type?: string
        status?: string
        starts_at?: string | null
        ends_at?: string | null
        created_by: string
        created_at?: string
        updated_at?: string
        required_feature_id?: string | null
        token_cost?: number
    }
    Update: Partial<ExamsTable['Insert']>
    Relationships: []
}

type ExamSectionsTable = {
    Row: {
        id: string
        exam_id: string
        subject_id: string | null
        title: string
        sort_order: number
        duration_seconds: number | null
        question_count: number | null
        config: Json
    }
    Insert: {
        id?: string
        exam_id: string
        subject_id?: string | null
        title: string
        sort_order?: number
        duration_seconds?: number | null
        question_count?: number | null
        config?: Json
    }
    Update: Partial<ExamSectionsTable['Insert']>
    Relationships: []
}

type ExamQuestionItemsTable = {
    Row: {
        id: string
        exam_id: string
        section_id: string | null
        question_id: string
        question_version: number
        position: number
        score_weight: number | null
        created_at: string
    }
    Insert: {
        id?: string
        exam_id: string
        section_id?: string | null
        question_id: string
        question_version: number
        position: number
        score_weight?: number | null
        created_at?: string
    }
    Update: Partial<ExamQuestionItemsTable['Insert']>
    Relationships: []
}

type ExamAttemptsTable = {
    Row: {
        id: string
        exam_id: string
        user_id: string
        attempt_number: number
        status: string
        started_at: string | null
        submitted_at: string | null
        duration_used_seconds: number | null
        total_score: number | null
        percentage: number | null
        rank: number | null
        passed: boolean | null
        last_question_position: number | null
        last_saved_at: string | null
        metadata: Json
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        exam_id: string
        user_id: string
        attempt_number?: number
        status?: string
        started_at?: string | null
        submitted_at?: string | null
        duration_used_seconds?: number | null
        total_score?: number | null
        percentage?: number | null
        rank?: number | null
        passed?: boolean | null
        last_question_position?: number | null
        last_saved_at?: string | null
        metadata?: Json
        created_at?: string
        updated_at?: string
    }
    Update: Partial<ExamAttemptsTable['Insert']>
    Relationships: []
}

type AttemptQuestionsTable = {
    Row: {
        id: string
        attempt_id: string
        question_id: string
        question_version: number
        position: number
        section_id: string | null
        question_snapshot: Json
        max_score: number
        created_at: string
    }
    Insert: {
        id?: string
        attempt_id: string
        question_id: string
        question_version: number
        position: number
        section_id?: string | null
        question_snapshot: Json
        max_score?: number
        created_at?: string
    }
    Update: Partial<AttemptQuestionsTable['Insert']>
    Relationships: []
}

type AttemptAnswersTable = {
    Row: {
        id: string
        attempt_question_id: string
        selected_option_id: string | null
        answer_value: string | null
        is_correct: boolean | null
        score_awarded: number
        answered_at: string | null
        time_spent_seconds: number
        is_flagged: boolean
        created_at: string
        updated_at: string
    }
    Insert: {
        id?: string
        attempt_question_id: string
        selected_option_id?: string | null
        answer_value?: string | null
        is_correct?: boolean | null
        score_awarded?: number
        answered_at?: string | null
        time_spent_seconds?: number
        is_flagged?: boolean
        created_at?: string
        updated_at?: string
    }
    Update: Partial<AttemptAnswersTable['Insert']>
    Relationships: []
}

type AttemptScoresTable = {
    Row: {
        id: string
        attempt_id: string
        subject_id: string | null
        raw_score: number
        normalized_score: number | null
        percentage: number | null
        passing_score: number | null
        passed: boolean | null
        correct_count: number
        wrong_count: number
        unanswered_count: number
        created_at: string
    }
    Insert: {
        id?: string
        attempt_id: string
        subject_id?: string | null
        raw_score: number
        normalized_score?: number | null
        percentage?: number | null
        passing_score?: number | null
        passed?: boolean | null
        correct_count?: number
        wrong_count?: number
        unanswered_count?: number
        created_at?: string
    }
    Update: Partial<AttemptScoresTable['Insert']>
    Relationships: []
}

type EntitlementsTable = {
    Row: {
        id: string
        user_id: string
        feature_id: string
        source_type: string
        source_id: string | null
        status: string
        starts_at: string
        expires_at: string | null
        usage_limit: number | null
        usage_count: number
        created_at: string
    }
    Insert: {
        id?: string
        user_id: string
        feature_id: string
        source_type: string
        source_id?: string | null
        status?: string
        starts_at?: string
        expires_at?: string | null
        usage_limit?: number | null
        usage_count?: number
        created_at?: string
    }
    Update: Partial<EntitlementsTable['Insert']>
    Relationships: []
}

export type Database = {
    __InternalSupabase: { PostgrestVersion: '14.15' }
    public: {
        Tables: {
            profiles: ProfilesTable
            programs: ProgramsTable
            tracks: TracksTable
            subjects: SubjectsTable
            user_tracks: UserTracksTable
            user_track_preferences: UserTrackPreferencesTable
            roles: RolesTable
            permissions: PermissionsTable
            role_permissions: RolePermissionsTable
            user_roles: UserRolesTable

            periods: GenericTable
            track_periods: GenericTable
            knowledge_nodes: KnowledgeNodesTable
            knowledge_node_paths: KnowledgeNodePathsTable
            materials: GenericTable
            material_knowledge_nodes: GenericTable
            questions: QuestionsTable
            question_knowledge_nodes: QuestionKnowledgeNodesTable
            question_options: QuestionOptionsTable
            question_explanations: QuestionExplanationsTable
            question_assets: GenericTable
            tags: GenericTable
            question_tags: GenericTable
            question_versions: GenericTable
            exam_types: ExamTypesTable
            exam_rules: GenericTable
            exam_blueprints: GenericTable
            exam_blueprint_rules: GenericTable
            exams: ExamsTable
            exam_sections: ExamSectionsTable
            exam_question_items: ExamQuestionItemsTable
            exam_attempts: ExamAttemptsTable
            attempt_questions: AttemptQuestionsTable
            attempt_answers: AttemptAnswersTable
            attempt_answer_options: GenericTable
            attempt_scores: AttemptScoresTable
            user_knowledge_progress: GenericTable
            user_subject_progress: GenericTable
            user_readiness: GenericTable
            user_question_state: GenericTable
            learning_recommendations: GenericTable
            remedial_sessions: GenericTable
            remedial_session_items: GenericTable
            user_activity_daily: GenericTable
            user_streaks: GenericTable
            user_question_bookmarks: GenericTable
            user_question_notes: GenericTable
            products: GenericTable
            product_prices: GenericTable
            features: GenericTable
            product_features: GenericTable
            entitlements: EntitlementsTable
            wallets: GenericTable
            wallet_transactions: GenericTable
            orders: GenericTable
            order_items: GenericTable
            payments: GenericTable
            payment_webhook_events: GenericTable
            promotions: GenericTable
            promotion_products: GenericTable
            promotion_redemptions: GenericTable
            refunds: GenericTable
            events: GenericTable
            event_sessions: GenericTable
            event_registrations: GenericTable
            event_rankings: GenericTable
            leaderboards: GenericTable
            leaderboard_entries: GenericTable
            certificate_templates: GenericTable
            certificates: GenericTable
            organizations: GenericTable
            organization_members: GenericTable
            classes: GenericTable
            class_members: GenericTable
            organization_licenses: GenericTable
            organization_exam_assignments: GenericTable
            content_reviews: GenericTable
            question_reports: GenericTable
            notifications: GenericTable
            notification_campaigns: GenericTable
            notification_deliveries: GenericTable
            audit_logs: GenericTable
            feature_flags: GenericTable
            feature_flag_overrides: GenericTable
            system_settings: GenericTable
            user_devices: GenericTable
            session_activity: GenericTable
            attempt_events: GenericTable
            generated_reports: GenericTable
            question_statistics: GenericTable
            exam_statistics: GenericTable
        }
        Views: { [_ in never]: never }
        Functions: {
            /**
             * Entri ini ditulis tangan, bukan hasil `supabase gen types`.
             * Karena bagian lain masih `GenericTable`, SETIAP nama RPC yang dipakai
             * dari TypeScript harus didaftarkan di sini — kalau tidak, pemanggilan
             * `admin.rpc(...)` gagal typecheck sebagai nama fungsi tak dikenal.
             *
             * `update_attempt_answer_scores` — lihat migration
             * `20260918041911_batch_update_attempt_answer_scores.sql`.
             * Menulis skor seluruh jawaban satu attempt dalam satu round trip
             * (menghilangkan N+1 pada submit ujian).
             */
            update_attempt_answer_scores: {
                Args: { p_scores: Json }
                Returns: number
            }
            /**
             * `get_user_subject_progress` — lihat migration
             * `20260918130000_subject_progress_aggregate_rpc.sql`.
             * Agregat progres per subjek dihitung di database, menggantikan
             * agregasi tanpa batas di Node (satu baris per subjek, satu round trip).
             */
            get_user_subject_progress: {
                Args: { p_user_id: string }
                Returns: Array<{
                    subject_id: string
                    attempts: number
                    questions_answered: number
                    correct_answers: number
                    total_questions: number
                    weighted_percentage: number
                }>
            }
            /**
             * `save_attempt_answer_for_user` — lihat migration
             * `20260918150000_save_attempt_answer_single_round_trip.sql`.
             * Menyimpan jawaban satu soal (validasi + tulis) dalam satu round trip,
             * menggantikan lima panggilan PostgREST berurutan per klik jawaban.
             */
            save_attempt_answer_for_user: {
                Args: {
                    p_user_id: string
                    p_attempt_id: string
                    p_question_id: string
                    p_option_ids: string[]
                }
                Returns: Json
            }
            /**
             * `claim_voucher` — lihat migration
             * `20260918180000_voucher_claim_schema_v2.sql`.
             * Klaim kode voucher lalu kredit token ke wallet program yang diminta.
             * Idempoten: klaim ulang mengembalikan `already_claimed: true` tanpa
             * menambah token lagi.
             */
            claim_voucher: {
                Args: {
                    p_user_id: string
                    p_voucher_code: string
                    p_wallet_type: string
                }
                Returns: Json
            }
        }
        Enums: { [_ in never]: never }
        CompositeTypes: { [_ in never]: never }
    }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals['public']

export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update']
