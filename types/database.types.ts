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
    Relationships: [{
        foreignKeyName: 'fk_entitlements_feature_id_features'
        columns: ['feature_id']
        isOneToOne: false
        referencedRelation: 'features'
        referencedColumns: ['id']
    }]
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
            admin_assessment_supply: {
                Args: { p_exam_ids: string[] }
                Returns: Array<{exam_id:string;bound_count:number;approved_bound_count:number;reviewed_bound_count:number;sections:Json}>
            }
            admin_drill_supply: {
                Args: { p_program_id:string;p_track_id:string;p_node_ids:string[] }
                Returns: Array<{node_id:string;available_count:number}>
            }
            admin_resource_counts: {
                Args: {p_kind:string;p_ids:string[]}
                Returns: Array<{resource_id:string;total:number}>
            }
            admin_question_status_counts: {
                Args: {p_program_id:string;p_track_id:string}
                Returns: Json
            }
            admin_monitoring_page: {
                Args: {p_event_id?:string|null;p_organization_id?:string|null;p_batch_id?:string|null;p_assignment_id?:string|null;p_exam_id?:string|null;p_search?:string;p_status?:string;p_page?:number}
                Returns: Json
            }
            admin_question_page: {
                Args: {p_program_id:string;p_track_id:string;p_search?:string;p_status?:string;p_subject_id?:string|null;p_node_id?:string|null;p_review?:string;p_stage?:string;p_reviewer?:string;p_page?:number;p_id?:string|null}
                Returns: Json
            }
            get_question_bank_editor: {
                Args: { p_program: string; p_track: string; p_id?: string | null }
                Returns: Json
            }
            mutate_question_bank: {
                Args: { p_payload: Json }
                Returns: Json
            }
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
            /**
             * RPC alur review konten — lihat migration
             * `202607130001_event_certificates.sql` dan
             * `20260823121937_cpns_legacy_import_guard_v1.sql`.
             *
             * Dipakai aksi batch review (`app/actions/content-review-batch.ts`).
             * Semuanya menegakkan `auth.uid()` dan permission di dalam fungsi,
             * sehingga jalur ini TIDAK menembus penjaga workflow.
             */
            submit_question_for_review: {
                Args: { p_question_id: string }
                Returns: Json
            }
            assign_question_reviewer: {
                Args: { p_question_id: string; p_reviewer_id: string }
                Returns: Json
            }
            publish_question: {
                Args: { p_question_id: string }
                Returns: Json
            }
            bulk_review_pilot_stage: {
                Args: { p_batch: string; p_decision: string; p_notes: string | null }
                Returns: Json
            }
            /**
             * Menugaskan `auth.uid()` sebagai reviewer untuk SEMUA soal batch
             * yang masih punya review pending tanpa reviewer.
             *
             * Wajib dipanggil SEBELUM `bulk_review_pilot_stage` di setiap tahap:
             * `review_question_stage` mengosongkan `reviewer_id` (di `questions`
             * dan `content_reviews`) setiap kali satu tahap selesai, sedangkan
             * `bulk_review_pilot_stage` hanya menyentuh soal yang
             * `reviewer_id = auth.uid()`. Jadi tiap tahap harus diklaim ulang.
             */
            claim_pilot_review_stage: {
                Args: { p_batch: string }
                Returns: Json
            }
            /**
             * Modul admin: Users & Roles, Reports, Audit Log — lihat migration
             * `20260919120000_admin_users_reports_audit.sql`.
             *
             * Kenapa lewat RPC dan bukan SELECT langsung: `user_roles`, `roles`,
             * `permissions`, dan `audit_logs` mengaktifkan RLS TANPA policy,
             * sehingga `authenticated` tidak bisa membacanya sama sekali. Setiap
             * fungsi memeriksa permission-nya sendiri, dan operasi tulis
             * menegakkan penjaga anti-lockout di database.
             */
            admin_list_users: {
                Args: {
                    p_search: string | null
                    p_role: string | null
                    p_status: string | null
                    p_limit: number | null
                    p_offset: number | null
                }
                Returns: Json
            }
            admin_list_roles: {
                Args: Record<string, never>
                Returns: Json
            }
            admin_assign_user_role: {
                Args: { p_user_id: string; p_role_code: string }
                Returns: Json
            }
            admin_revoke_user_role: {
                Args: { p_user_id: string; p_role_code: string }
                Returns: Json
            }
            admin_set_user_status: {
                Args: { p_user_id: string; p_status: string }
                Returns: Json
            }
            admin_report_overview: {
                Args: { p_program_code: string | null; p_track_code: string | null }
                Returns: Json
            }
            admin_list_audit_logs: {
                Args: {
                    p_action: string | null
                    p_entity_type: string | null
                    p_actor_id: string | null
                    p_limit: number | null
                    p_offset: number | null
                }
                Returns: Json
            }
            admin_audit_facets: {
                Args: Record<string, never>
                Returns: Json
            }
            /**
             * Modul Entitlements (token, voucher, pass) dan Settings
             * (konfigurasi platform) — lihat migration
             * `20260919140000_admin_entitlements_settings.sql`.
             *
             * `admin_adjust_wallet` menyentuh saldo token bernilai uang, jadi
             * fungsinya menolak penyesuaian dompet sendiri, jumlah nol, saldo
             * negatif, dan alasan yang terlalu pendek — semuanya di database.
             */
            admin_entitlement_overview: {
                Args: Record<string, never>
                Returns: Json
            }
            admin_list_wallets: {
                Args: {
                    p_search: string | null
                    p_wallet_type: string | null
                    p_limit: number | null
                    p_offset: number | null
                }
                Returns: Json
            }
            admin_list_wallet_transactions: {
                Args: {
                    p_user_id: string | null
                    p_wallet_type: string | null
                    p_limit: number | null
                    p_offset: number | null
                }
                Returns: Json
            }
            admin_adjust_wallet: {
                Args: {
                    p_user_id: string
                    p_wallet_type: string
                    p_amount: number
                    p_reason: string
                }
                Returns: Json
            }
            admin_list_vouchers: {
                Args: Record<string, never>
                Returns: Json
            }
            admin_upsert_voucher: {
                Args: {
                    p_id: string | null
                    p_code: string
                    p_quota_amount: number
                    p_max_uses: number
                    p_expires_at: string | null
                    p_is_active: boolean | null
                    p_wallet_type: string | null
                }
                Returns: Json
            }
            admin_list_entitlements: {
                Args: {
                    p_search: string | null
                    p_status: string | null
                    p_limit: number | null
                    p_offset: number | null
                }
                Returns: Json
            }
            admin_list_settings: {
                Args: Record<string, never>
                Returns: Json
            }
            admin_upsert_feature_flag: {
                Args: {
                    p_id: string | null
                    p_key: string
                    p_name: string
                    p_enabled: boolean | null
                    p_rollout_percentage: number | null
                }
                Returns: Json
            }
            admin_upsert_certificate_template: {
                Args: {
                    p_id: string
                    p_name: string
                    p_template_url: string | null
                    p_config: Json | null
                }
                Returns: Json
            }
            admin_set_track_period_active: {
                Args: { p_track_period_id: string; p_is_active: boolean | null }
                Returns: Json
            }
            admin_upsert_system_setting: {
                Args: { p_key: string; p_value: Json }
                Returns: Json
            }
            admin_delete_system_setting: {
                Args: { p_key: string }
                Returns: Json
            }
            /**
             * MVP CPNS Instansi Managed Service — lihat migration
             * `20260919160000_organization_instansi_foundation.sql` dan
             * `20260919170000_organization_admin_rpcs.sql`.
             *
             * `authenticated` hanya memegang SELECT pada tabel instansi, jadi
             * seluruh penulisan lewat RPC ini. Penjaganya menolak kode duplikat,
             * mengaktifkan batch pada instansi nonaktif, dan menonaktifkan
             * instansi yang masih punya batch aktif.
             */
            admin_list_organizations: {
                Args: {
                    p_search: string | null
                    p_status: string | null
                    p_limit: number | null
                    p_offset: number | null
                }
                Returns: Json
            }
            admin_upsert_organization: {
                Args: {
                    p_id: string | null
                    p_name: string
                    p_code: string
                    p_type: string | null
                    p_city: string | null
                    p_province: string | null
                    p_address: string | null
                    p_contact_name: string | null
                    p_contact_email: string | null
                    p_contact_phone: string | null
                    p_status: string | null
                    p_notes: string | null
                }
                Returns: Json
            }
            admin_get_organization: {
                Args: { p_id: string }
                Returns: Json
            }
            admin_upsert_batch: {
                Args: {
                    p_id: string | null
                    p_organization_id: string
                    p_code: string
                    p_name: string
                    p_starts_at: string | null
                    p_ends_at: string | null
                    p_status: string | null
                    p_notes: string | null
                }
                Returns: Json
            }
            admin_rotate_batch_invite: {
                Args: { p_batch_id: string }
                Returns: Json
            }
            admin_batch_monitoring: {
                Args: { p_batch_id: string }
                Returns: Json
            }
            admin_export_organization: {
                Args: { p_organization_id: string; p_batch_id: string | null }
                Returns: Json
            }
            admin_delete_composed_exam: {
                Args: { p_exam_id: string }
                Returns: Json
            }
            admin_list_org_templates: {
                Args: { p_organization_id: string | null }
                Returns: Json
            }
            admin_template_shortages: {
                Args: { p_template_id: string }
                Returns: Json
            }
            admin_upsert_org_template: {
                Args: {
                    p_id: string | null
                    p_organization_id: string | null
                    p_name: string
                    p_twk_count: number
                    p_tiu_count: number
                    p_tkp_count: number
                    p_duration_seconds: number
                    p_max_attempts: number
                    p_randomize_questions: boolean | null
                    p_randomize_options: boolean | null
                    p_show_explanation: string | null
                    p_ranking_visibility: string | null
                    p_status: string | null
                }
                Returns: Json
            }
            admin_compose_exam_from_template: {
                Args: { p_template_id: string; p_title: string | null; p_status: string | null }
                Returns: Json
            }
            admin_list_assignments: {
                Args: { p_batch_id: string | null }
                Returns: Json
            }
            admin_upsert_assignment: {
                Args: {
                    p_id: string | null
                    p_batch_id: string
                    p_exam_id: string
                    p_template_id: string | null
                    p_starts_at: string | null
                    p_due_at: string | null
                    p_is_active: boolean | null
                    p_notes: string | null
                }
                Returns: Json
            }
            admin_import_participants: {
                Args: { p_batch_id: string; p_rows: Json; p_dry_run: boolean | null }
                Returns: Json
            }
            admin_delete_organization: {
                Args: { p_id: string }
                Returns: Json
            }
            admin_remove_participant: {
                Args: { p_participant_id: string }
                Returns: Json
            }
            admin_set_participant_status: {
                Args: { p_participant_id: string; p_status: string }
                Returns: Json
            }
            admin_list_participants: {
                Args: {
                    p_organization_id: string | null
                    p_batch_id: string | null
                    p_search: string | null
                    p_status: string | null
                    p_limit: number | null
                    p_offset: number | null
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
