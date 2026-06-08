export function getVisibleEventGroupLink(
    groupLink: string | null | undefined,
    participantId: string | null | undefined
) {
    if (!participantId) return null

    const trimmedLink = groupLink?.trim()
    return trimmedLink || null
}
