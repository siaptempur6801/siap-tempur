export function getVisibleEventGroupLink(
  groupLink: string | null | undefined,
  participantId: string | null | undefined,
) {
  if (!participantId) return null

  const trimmedLink = groupLink?.trim()
  return trimmedLink || null
}

export type EventCloseTimeInput = {
  starts_at: string
  duration_minutes: number
  start_grace_minutes: number
}

export type EventLeaderboardAccessEvent = EventCloseTimeInput & {
  status: string
}

export function getEffectiveEventCloseTime(event: EventCloseTimeInput) {
  return new Date(
    new Date(event.starts_at).getTime() +
      (event.duration_minutes + event.start_grace_minutes) * 60 * 1000,
  )
}

export function canViewCompletedEventLeaderboard({
  event,
  participantId,
  now = new Date(),
}: {
  event: EventLeaderboardAccessEvent
  participantId: string | null | undefined
  now?: Date
}) {
  if (!participantId) return false

  return event.status === 'closed' || now.getTime() > getEffectiveEventCloseTime(event).getTime()
}
