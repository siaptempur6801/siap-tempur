export function shouldRefreshEventLeaderboard(status: string | null | undefined) {
  return status === 'live'
}
