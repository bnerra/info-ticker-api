import { nflEndpoints } from '../constants/nflEndpoints'

export interface NFLTeam {
  id: string
  abbreviation: string
  displayName: string
  logo: string
  score?: string
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
}

export interface NFLGamesCache {
  games: NFLGame[]
  lastUpdated: number | null
}

export class NFLGameService {

  private nflGameCache: NFLGamesCache = {
    games: [],
    lastUpdated: null
  }

  private normalizeTeam(competitor: any): NFLTeam {
    return {
      id: competitor.team.id,
      abbreviation: competitor.team.abbreviation,
      displayName: competitor.team.displayName,
      logo: competitor.team.logo,
      score: competitor.score
    }
  }

  private normalizeGame(event: any): NFLGame {
    const competition = event.competitions[0]
    const statusType = competition.status.type
    const situation = competition.situation

    const homeCompetitor = competition.competitors.find((c: any) => c.homeAway === 'home')
    const awayCompetitor = competition.competitors.find((c: any) => c.homeAway === 'away')

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
      homeTeam: this.normalizeTeam(homeCompetitor),
      awayTeam: this.normalizeTeam(awayCompetitor)
    }
  }

  async NFLRefresh() {
    try {
      const url = nflEndpoints.scoreboard()
      const response = await fetch(url)
      const data = await response.json()

      this.nflGameCache.games = (data.events ?? []).map((event: any) => this.normalizeGame(event))
      this.nflGameCache.lastUpdated = Date.now()
    } catch (err) {
      console.log('NFL refresh failed', err)
    }

    return this.nflGameCache
  }
}
