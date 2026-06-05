
const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1'
const mlbStartDate = '2026-03-25'
const mlbEndDate = '2027-01-01'

export const mlbEndpoints = {
  liveFeed: (gamePk: number) => `${MLB_API_BASE}.1/game/${gamePk}/feed/live`,
  boxscore: (gamePk: number) => `${MLB_API_BASE}/game/${gamePk}/boxscore`,
  playerInfo: (playerId: number) => `${MLB_API_BASE}/people/${playerId}`,
  roster: (teamId: number) => `${MLB_API_BASE}/teams/${teamId}/roster`,
  scheduleDay: (date: string) => {
    const url = new URL(`${MLB_API_BASE}/schedule`)

    url.searchParams.set('sportId', '1')
    url.searchParams.set('date', date)

    return url.toString()
  },
  teamSchedule: (teamId: number) => {
    const url = new URL(`${MLB_API_BASE}/schedule`)

    url.searchParams.set('sportId', '1')
    url.searchParams.set('teamId', `${teamId}`)
    url.searchParams.set('startDate', mlbStartDate)
    url.searchParams.set('endDate', mlbEndDate)

    return url.toString()
  },
  divisionStandings: (divisionId: number) => {
    const url = new URL(`${MLB_API_BASE}/standings`)

    url.searchParams.set('divisionId', `${divisionId}`)
    url.searchParams.set('hydrate', 'team')

    return url.toString()
  },
  leagueStandings: (leagueId: number) => {
    const url = new URL(`${MLB_API_BASE}/standings`)

    url.searchParams.set('leagueId', `${leagueId}`)
    url.searchParams.set('hydrate', 'division,team')

    return url.toString()
  }
}