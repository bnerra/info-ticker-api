const NFL_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export const nflEndpoints = {
  scoreboard: (week?: number) => week
    ? `${NFL_API_BASE}/scoreboard?seasontype=2&week=${week}`
    : `${NFL_API_BASE}/scoreboard?seasontype=2`
}
