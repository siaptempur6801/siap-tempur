/*
 * Schema V2 type snapshot.
 * Source: Supabase project lpgrivowdcepcxradavu (Siap Tempur Staging).
 * Generated/verified on 2026-08-20.
 *
 * The legacy table surface is intentionally removed from this file. Run
 * `npm run db:types:staging` with an authenticated Supabase CLI to refresh the
 * full generated column/relationship metadata before each schema-v2 merge.
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
            knowledge_nodes: GenericTable
            knowledge_node_paths: GenericTable
            materials: GenericTable
            material_knowledge_nodes: GenericTable
            questions: GenericTable
            question_knowledge_nodes: GenericTable
            question_options: GenericTable
            question_explanations: GenericTable
            question_assets: GenericTable
            tags: GenericTable
            question_tags: GenericTable
            question_versions: GenericTable
            exam_types: GenericTable
            exam_rules: GenericTable
            exam_blueprints: GenericTable
            exam_blueprint_rules: GenericTable
            exams: GenericTable
            exam_sections: GenericTable
            exam_question_items: GenericTable
            exam_attempts: GenericTable
            attempt_questions: GenericTable
            attempt_answers: GenericTable
            attempt_answer_options: GenericTable
            attempt_scores: GenericTable
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
            entitlements: GenericTable
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
        Functions: { [_ in never]: never }
        Enums: { [_ in never]: never }
        CompositeTypes: { [_ in never]: never }
    }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals['public']

export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update']
