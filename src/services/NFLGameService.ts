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

export interface NFLStatLeader {
  category: string
  displayName: string
  playerName: string
  teamId: string
  teamAbbreviation: string
  displayValue: string
  value: number
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
  leaders: NFLStatLeader[]
}

export interface NFLGamesCache {
  games: NFLGame[]
  dailyLeaders: NFLStatLeader[]
  lastUpdated: number | null
}

const NFL_TIMEZONE = 'America/Chicago'

const getLocalDateString = (isoString: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: NFL_TIMEZONE }).format(new Date(isoString))

export class NFLGameService {

  private nflGameCache: NFLGamesCache = {
    games: [],
    dailyLeaders: [],
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

  private normalizeLeaders(rawLeaders: any, homeTeam: NFLTeam, awayTeam: NFLTeam): NFLStatLeader[] {
    if (!rawLeaders) {
      return []
    }

    const relevantCategories = ['passingYards', 'rushingYards', 'receivingYards']

    return rawLeaders
      .filter((category: any) => relevantCategories.includes(category.name))
      .map((category: any) => {
        const leader = category.leaders?.[0]
        const teamId = leader?.team?.id
        const teamAbbreviation = teamId === homeTeam.id ? homeTeam.abbreviation : awayTeam.abbreviation

        return {
          category: category.name,
          displayName: category.displayName,
          playerName: leader?.athlete?.displayName ?? 'Unknown',
          teamId,
          teamAbbreviation,
          displayValue: leader?.displayValue ?? '',
          value: leader?.value ?? 0
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

  private computeDailyLeaders(games: NFLGame[]): NFLStatLeader[] {
    const today = getLocalDateString(new Date().toISOString())
    const todaysGames = games.filter((game) => getLocalDateString(game.kickoff) === today)

    const categories = ['passingYards', 'rushingYards', 'receivingYards']

    return categories
      .map((category) => {
        const candidates = todaysGames
          .map((game) => game.leaders.find((leader) => leader.category === category))
          .filter((leader): leader is NFLStatLeader => Boolean(leader))

        if (candidates.length === 0) {
          return null
        }

        return candidates.reduce((best, current) => (current.value > best.value ? current : best))
      })
      .filter((leader): leader is NFLStatLeader => Boolean(leader))
  }

  async NFLRefresh() {
    try {
      const url = nflEndpoints.scoreboard()
      const response = await fetch(url)
      const data = await response.json()

      const normalizedGames = (data.events ?? []).map((event: any) => this.normalizeGame(event))

      this.nflGameCache.games = normalizedGames
      this.nflGameCache.dailyLeaders = this.computeDailyLeaders(normalizedGames)
      this.nflGameCache.lastUpdated = Date.now()
    } catch (err) {
      console.log('NFL refresh failed', err)
    }

    return this.nflGameCache
  }
}
