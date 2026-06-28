
const NHL_API_BASE = 'https://api-web.nhle.com/v1'
const nhlStartYear = '2025'
const nhlEndYear = '2026'

export const nhlEndpoints = {
  liveFeed: (gameId: number) => `${NHL_API_BASE}/gamecenter/${gameId}/landing`,
  boxscore: (gameId: number) => `${NHL_API_BASE}/gamecenter/${gameId}/boxscore`,
  playerInfo: (playerId: number) => `${NHL_API_BASE}/player/${playerId}/landing`,
  roster: (teamAbb: number) => `${NHL_API_BASE}/roster/${teamAbb}/current`,
  teamSchedule: (teamAbb: number) => `${NHL_API_BASE}/club-schedule-season/${teamAbb}/${nhlStartYear}${nhlEndYear}`,
  standings: () => `${NHL_API_BASE}/standings/now`,
}
