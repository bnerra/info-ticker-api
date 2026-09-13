import { nflEndpoints } from '../constants/nflEndpoints'

export interface NFLTeam {
  id: string
  abbreviation: string
  displayName: string
  logo: string
  color?: string
  alternateColor?: string
  score?: string
}

export interface NFLStatLeaderEntry {
  playerName: string
  teamId: string
  teamAbbreviation: string
  displayValue: string
  value: number
}

export interface NFLStatLeaderGroup {
  category: string
  displayName: string
  entries: NFLStatLeaderEntry[]
}

export interface NFLGame {
  id: string
  status: 'preview' | 'live' | 'summary'
  statusDetail: string
  kickoff: string
  period?: number
  displayClock?: string
  possessionTeamId?: string
  situationText?: string
  isRedZone?: boolean
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  leaders: NFLStatLeaderGroup[]
}

export interface NFLGamesCache {
  games: NFLGame[]
  weeklyLeaders: NFLStatLeaderGroup[]
  lastUpdated: number | null
}

const WEEKLY_LEADER_CATEGORIES = [
  { name: 'passingYards', displayName: 'Passing Leaders' },
  { name: 'rushingYards', displayName: 'Rushing Leaders' },
  { name: 'receivingYards', displayName: 'Receiving Leaders' }
]

export class NFLGameService {

  private nflGameCache: NFLGamesCache = {
    games: [],
    weeklyLeaders: [],
    lastUpdated: null
  }

  private normalizeTeam(competitor: any): NFLTeam {
    return {
      id: competitor.team.id,
      abbreviation: competitor.team.abbreviation,
      displayName: competitor.team.displayName,
      logo: competitor.team.logo,
      color: competitor.team.color,
      alternateColor: competitor.team.alternateColor,
      score: competitor.score
    }
  }

  private normalizeLeaders(rawLeaders: any, homeTeam: NFLTeam, awayTeam: NFLTeam): NFLStatLeaderGroup[] {
    if (!rawLeaders) {
      return []
    }

    const relevantCategories = WEEKLY_LEADER_CATEGORIES.map((c) => c.name)

    return rawLeaders
      .filter((category: any) => relevantCategories.includes(category.name))
      .map((category: any) => {
        const leader = category.leaders?.[0]
        const teamId = leader?.team?.id
        const teamAbbreviation = teamId === homeTeam.id ? homeTeam.abbreviation : awayTeam.abbreviation

        return {
          category: category.name,
          displayName: category.displayName,
          entries: leader ? [{
            playerName: leader?.athlete?.displayName ?? 'Unknown',
            teamId,
            teamAbbreviation,
            displayValue: leader?.displayValue ?? '',
            value: leader?.value ?? 0
          }] : []
        }
      })
  }

  private normalizeGame(event: any): NFLGame {
    const competition = event.competitions[0]
    const statusType = competition.status.type
    const situation = competition.situation

    const homeCompetitor = competition.competitors.find((c: any) => c.homeAway === 'home')
    const awayCompetitor = competition.competitors.find((c: any) => c.homeAway === 'away')

    const homeTeam = this.normalizeTeam(homeCompetitor)
    const awayTeam = this.normalizeTeam(awayCompetitor)

    let status: NFLGame['status'] = 'live'
    if (statusType.name === 'STATUS_SCHEDULED') {
      status = 'preview'
    } else if (statusType.completed) {
      status = 'summary'
    }

    return {
      id: event.id,
      status,
      statusDetail: statusType.shortDetail,
      kickoff: event.date,
      period: competition.status.period,
      displayClock: competition.status.displayClock,
      possessionTeamId: situation?.possession,
      situationText: situation?.downDistanceText,
      isRedZone: situation?.isRedZone,
      homeTeam,
      awayTeam,
      leaders: this.normalizeLeaders(competition.leaders, homeTeam, awayTeam)
    }
  }

  private computeWeeklyLeaders(games: NFLGame[]): NFLStatLeaderGroup[] {
    return WEEKLY_LEADER_CATEGORIES.map(({ name, displayName }) => {
      const entries = games
        .flatMap((game) => game.leaders.find((group) => group.category === name)?.entries ?? [])
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      return { category: name, displayName, entries }
    })
  }

  async NFLRefresh() {
    try {
      const url = nflEndpoints.scoreboard()
      const response = await fetch(url)
      const data = await response.json()

      const normalizedGames = (data.events ?? []).map((event: any) => this.normalizeGame(event))

      this.nflGameCache.games = normalizedGames
      this.nflGameCache.weeklyLeaders = this.computeWeeklyLeaders(normalizedGames)
      this.nflGameCache.lastUpdated = Date.now()
    } catch (err) {
      console.log('NFL refresh failed', err)
    }

    return this.nflGameCache
  }
}
