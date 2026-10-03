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

export interface NFLFeedEntry {
  id: string
  gameId: string
  teamAbbreviation: string
  text: string
  scoreValue: number
  statYardage: number
  timestamp: number
}

export interface NFLGamesCache {
  games: NFLGame[]
  weeklyLeaders: NFLStatLeaderGroup[]
  feed: NFLFeedEntry[]
  lastUpdated: number | null
}

const WEEKLY_LEADER_CATEGORIES = [
  { name: 'passingYards', displayName: 'Passing Leaders' },
  { name: 'rushingYards', displayName: 'Rushing Leaders' },
  { name: 'receivingYards', displayName: 'Receiving Leaders' }
]

const BIG_PLAY_YARDAGE = 20
const MAX_FEED_ENTRIES = 20

export class NFLGameService {

  private nflGameCache: NFLGamesCache = {
    games: [],
    weeklyLeaders: [],
    feed: [],
    lastUpdated: null
  }

  private lastSeenPlayIds: Record<string, string> = {}

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

  private isNotablePlay(play: any): boolean {
    if (play.scoreValue > 0) {
      return true
    }

    if ((play.statYardage ?? 0) >= BIG_PLAY_YARDAGE) {
      return true
    }

    const playType: string = play.type?.text ?? ''

    return /interception|fumble recovery \(opponent\)/i.test(playType)
  }

  private checkForFeedEntry(gameId: string, competition: any, homeTeam: NFLTeam, awayTeam: NFLTeam) {
    const lastPlay = competition.situation?.lastPlay

    if (!lastPlay || this.lastSeenPlayIds[gameId] === lastPlay.id) {
      return
    }

    this.lastSeenPlayIds[gameId] = lastPlay.id

    if (!this.isNotablePlay(lastPlay)) {
      return
    }

    const teamId = lastPlay.team?.id
    const teamAbbreviation = teamId === homeTeam.id ? homeTeam.abbreviation : awayTeam.abbreviation

    this.nflGameCache.feed.unshift({
      id: lastPlay.id,
      gameId,
      teamAbbreviation,
      text: lastPlay.text,
      scoreValue: lastPlay.scoreValue ?? 0,
      statYardage: lastPlay.statYardage ?? 0,
      timestamp: Date.now()
    })

    this.nflGameCache.feed = this.nflGameCache.feed.slice(0, MAX_FEED_ENTRIES)
  }

  private isToday(iso: string): boolean {
    return new Date(iso).toDateString() === new Date().toDateString()
  }

  private findHeroGame(games: NFLGame[]): NFLGame | null {
    const todaysGames = games.filter((game) => this.isToday(game.kickoff))
    const liveGames = todaysGames.filter((game) => game.status === 'live')

    if (liveGames.length === 1) {
      return liveGames[0] ?? null
    }
    if (liveGames.length === 0 && todaysGames.length === 1) {
      return todaysGames[0] ?? null
    }
    return null
  }

  private computeGameTopLeaders(playersData: any[]): NFLStatLeaderGroup[] {
    const categories = [
      { statName: 'passing', key: 'passingYards', category: 'passingYards', displayName: 'Passing Leaders' },
      { statName: 'rushing', key: 'rushingYards', category: 'rushingYards', displayName: 'Rushing Leaders' },
      { statName: 'receiving', key: 'receivingYards', category: 'receivingYards', displayName: 'Receiving Leaders' }
    ]

    return categories.map(({ statName, key, category, displayName }) => {
      const entries: NFLStatLeaderEntry[] = []

      for (const teamBlock of playersData) {
        const statGroup = teamBlock.statistics.find((s: any) => s.name === statName)
        if (!statGroup) continue

        const statIndex = statGroup.keys.indexOf(key)
        if (statIndex === -1) continue

        for (const athleteEntry of statGroup.athletes) {
          const rawValue = athleteEntry.stats[statIndex]
          const value = Number(rawValue)
          if (!Number.isFinite(value)) continue

          entries.push({
            playerName: athleteEntry.athlete.displayName,
            teamId: teamBlock.team.id,
            teamAbbreviation: teamBlock.team.abbreviation,
            displayValue: `${rawValue} ${statGroup.labels[statIndex]}`,
            value
          })
        }
      }

      const topEntries = entries.sort((a, b) => b.value - a.value).slice(0, 5)
      return { category, displayName, entries: topEntries }
    })
  }

  private async fetchGameLeaders(eventId: string): Promise<NFLStatLeaderGroup[] | null> {
    try {
      const url = nflEndpoints.summary(eventId)
      const response = await fetch(url)
      const data = await response.json()
      return this.computeGameTopLeaders(data.boxscore.players)
    } catch (err) {
      console.log('NFL game leaders fetch failed', err)
      return null
    }
  }

  async NFLRefresh() {
    try {
      const url = nflEndpoints.scoreboard()
      const response = await fetch(url)
      const data = await response.json()
      const events = data.events ?? []

      const normalizedGames: NFLGame[] = events.map((event: any) => this.normalizeGame(event))

      normalizedGames.forEach((game, index) => {
        const competition = events[index].competitions[0]
        this.checkForFeedEntry(game.id, competition, game.homeTeam, game.awayTeam)
      })

      const heroGame = this.findHeroGame(normalizedGames)

      if (heroGame) {
        const detailedLeaders = await this.fetchGameLeaders(heroGame.id)
        if (detailedLeaders) {
          heroGame.leaders = detailedLeaders
        }
      }

      this.nflGameCache.games = normalizedGames
      this.nflGameCache.weeklyLeaders = this.computeWeeklyLeaders(normalizedGames)
      this.nflGameCache.lastUpdated = Date.now()
    } catch (err) {
      console.log('NFL refresh failed', err)
    }

    return this.nflGameCache
  }
}
