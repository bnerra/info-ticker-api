
export interface GameData {
  gamePk: number
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  inning: number
  inningHalf: 'Top' | 'Bot'
}
