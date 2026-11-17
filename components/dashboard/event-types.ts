export type EventStatus = 'scheduled' | 'live' | 'closed'

export type UserEvent = {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  start_grace_minutes: number
  duration_minutes: number
  max_participants: number | null
  requires_code: boolean
  group_link: string | null
  flyer_image_url: string | null
  is_paid: boolean
  price: number
  status: EventStatus
  certificate_enabled: boolean
  certificate_released_at: string | null
  certificate_number: string | null
  certificate_name: string | null
  certificate_kind: string | null
  certificate_name_locked_at: string | null
  participant_id: string | null
  participant_status: string | null
  session_id: string | null
  session_path: string
  event_session_status: string | null
  test_session_status: string | null
  question_count: number
  payment_status: string | null
  payment_order_id: string | null
  payment_snap_token: string | null
}

export interface EventClientProps {
  events: UserEvent[]
}
