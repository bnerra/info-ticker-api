import { isEmpty } from 'lodash'
import { fetchGamePks } from '../constants/fetchGames'
import { mlbEndpoints } from '../constants/mlbEndpoints'
import { weatherCodeMap } from '../constants/weatherCodeMap'
import { NHLGameService } from './NHLGameService'
import { FastifyBaseLogger } from 'fastify'

const nhlService = new NHLGameService()

enum ViewStatus {
  In_Progress = 'inProgress',
  Upcoming = 'upcoming',
  Concluded = 'concluded'
}

interface BattingLeader {
  name: string
  hits: number | '--'
  rbi: number | '--'
  hr: number | '--'
  summary: string
}

interface TeamDivisionalData {
  teamId?: number
  divisionRank: string
  wins: number | '--'
  losses: number | '--'
  gamesBack: string
}

interface DivisionStandings {
  divisionName: string
  standings: TeamDivisionalData[]
}

interface MLBDivisionRecord {
  division: {
    id: number
  }
  teamRecords: {
    team: {
      id: number
    }
    divisionRank: string
    wins: number
    losses: number
    gamesBack: string
  }[]
}

interface MLBStandingsResponse {
  records: MLBDivisionRecord[]
}

interface MLBPlayerResponse {
  people: {
    boxscoreName?: string
  }[]
}

export interface GamesCache {
  viewStatus: ViewStatus
  weatherDateTime: any,
  lastUpdated: any,
  currentGame: any
  lastGame: any
  nextGame: any
  divisionStandings: any
  inningByInning: any
  battingLeaders: any
  pitchingLeaders: any
  postponedGame: any
  nhl: any
}

//TODO: Pass Services Health Data

export class GameService {

  constructor(
    private logger: FastifyBaseLogger
  ) {}

  private cache: GamesCache = {
    viewStatus: ViewStatus.Concluded,
    weatherDateTime: {},
    lastUpdated: null,
    currentGame: {},
    lastGame: {},
    nextGame: {},
    divisionStandings: {},
    inningByInning: {},
    battingLeaders: {},
    pitchingLeaders: [],
    postponedGame: {},
    nhl: {}
    // services: {
    //   weather: {
    //     healthy: false,
    //     lastSuccess: 1784850830
    //   },
    //   mlb: {
    //     healthy: true
    //   },
    //   nhl: {
    //     healthy: true
    //   }
    // }
  }

  altDate(dateStr: any) {

    const [year, month, day] = dateStr.split('-')
    const shiftDate = new Date(year, month - 1, day)

    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC'
    })

    const parts = formatter.formatToParts(shiftDate)
    const weekday = parts.find((p: any) => p.type === 'weekday')?.value
    const mm = parts.find((p: any) => p.type === 'month')?.value
    const dd = parts.find((p: any) => p.type === 'day')?.value

    return `${weekday} ${mm}/${dd}`
  }

  getTimeFromISO(isoString: string) {
    const date = new Date(isoString)

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })

    return formatter.format(date)
  }

  async fetchWeatherDateTimeData() {
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=38.79&longitude=-90.63&current=temperature_2m,wind_speed_10m,cloud_cover,weather_code&hourly=precipitation_probability&temperature_unit=fahrenheit&wind_speed_unit=mph'
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Weather API returned: ${response.status}`)
      }

      const data = await response.json()

      if (!data.current) {
        throw new Error('Missing current weather')
      }

      const weatherCode = data.current?.weather_code || ''

      const date = new Date()

      const temperature =
        typeof data.current?.temperature_2m === 'number'
          ? `${Math.round(data.current?.temperature_2m)}\u00B0F`
          : '--'

      const weatherData = {
        temperature,
        weatherCode,
        forecast: weatherCodeMap[weatherCode] ?? '',
        date: new Intl.DateTimeFormat('en-GB', {
          weekday: 'short',
          month: 'short',
          day: '2-digit'
        })
        .format(date),
        time: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      }

      return weatherData
      
    } catch (err) {
      this.logger.error({ err }, 'Current weather data fetch failed.')

      return {
        temperature: '--',
        weatherCode: null,
        forecast: 'Unavailable',
        date: new Intl.DateTimeFormat('en-GB', {
          weekday: 'short',
          month: 'short',
          day: '2-digit'
        })
        .format(new Date()),
        time: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        status: 'Offline',
      }
    }
  }

  async fetchBattingStats(gamePk: number, team: string): Promise<BattingLeader[]> {
    try {
      const url = `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`fetchBattingStats call returned: ${response.status}`)
      }

      const data = await response.json()

      if (!data?.teams[team]?.players) {
        throw new Error(`Missing ${team} player data for gamePk ${gamePk}`)
      }

      const players = Object.values(data.teams?.[team]?.players ?? {})
      const batters = players.filter((player: any) => (player.stats?.batting && Object.keys(player.stats.batting).length > 0))

      const battingLeaders = [...batters].sort((a: any, b: any): any => {
        const aBat = a.stats.batting
        const bBat = b.stats.batting

        return (
          (bBat.homeRuns ?? 0) - (aBat.homeRuns ?? 0) ||
          (bBat.rbi ?? 0) - (aBat.rbi ?? 0) ||
          (bBat.hits ?? 0) - (aBat.hits ?? 0) ||
          (bBat.runs ?? 0) - (aBat.runs ?? 0)
        )
      })

      const filteredLeaders = battingLeaders.map((player: any) => ({
        name: player.person.boxscoreName,
        hits: player.stats.batting?.hits ?? 0,
        rbi: player.stats.batting?.rbi ?? 0,
        hr: player.stats.batting?.homeRuns ?? 0,
        summary: player.stats.batting?.summary ?? '',
      }))
        .slice(0, 3)
      
      return filteredLeaders

    } catch (err) {
      this.logger.error(
        {
          err,
          gamePk,
          team
        },
        `Failed fetching team batting stats.`
      )

      return Array.from({ length: 3}, () => ({
        name: '--',
        hits: '--',
        rbi: '--',
        hr: '--',
        summary: '--',
      }))
    }
  }

  async divisionStandings(divisionId: number, leagueId: number, divisionName: string): Promise<DivisionStandings> {
    try {
      const url = mlbEndpoints.divisionStandings(divisionId, leagueId)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`divisionStandings call returned: ${response.status}`)
      }

      const data: MLBStandingsResponse = await response.json()

      if (!data?.records) {
        throw new Error(`Missing division records for league id ${leagueId}`)
      }

      const division = data.records.find((record: MLBDivisionRecord) => record.division.id === divisionId)

      if (!division) {
        throw new Error(`Missing data for division id ${divisionId}`)
      }

      if (!division.teamRecords || isEmpty(division.teamRecords)) {
        throw new Error(`Missing team data for division id ${divisionId}`)
      }

      const standings: TeamDivisionalData[] = division.teamRecords.map(team => ({
        teamId: team.team.id,
        divisionRank: team.divisionRank,
        wins: team.wins,
        losses: team.losses,
        gamesBack: team.gamesBack,
      }))

      return {
        divisionName,
        standings
      }

    } catch (err) {
      this.logger.error(
        {
          err,
          divisionName,
          divisionId,
          leagueId
        },
        'Failed fetching division standings.'
      )

      const standings: TeamDivisionalData[] = Array.from({ length: 5 }, () => ({
        divisionRank: '--',
        wins: '--',
        losses: '--',
        gamesBack: '--'
      }))

      return {
        divisionName,
        standings
      }
    }
  }

  async fetchPlayerBoxscoreName(playerId: number): Promise<string> {
    try {
      const url = mlbEndpoints.playerInfo(playerId)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`fetchPlayerBoxscoreName call returned: ${response.status}`)
      }

      const data: MLBPlayerResponse = await response.json()

      const boxscoreName = data?.people?.[0]?.boxscoreName

      if (!boxscoreName) {
        throw new Error(`Missing boxscoreName for player id ${playerId}`)
      }

      return boxscoreName
    } catch (err) {
      this.logger.error(
        {
          err,
          playerId
        },
        'Failed fetching boxscoreName.'
      )

      return '--'
    }
  }

  async fetchPitcherRecord(id: number, side: string, data: any) {
    const playerData = data.liveData.boxscore.teams[side].players[`ID${id}`]

    return `(${playerData.seasonStats.pitching.wins}-${playerData.seasonStats.pitching.losses})`
  }

  async fetchPitcherSaves(id: number, side: string, data: any) {
    const playerData = data.liveData.boxscore.teams[side].players[`ID${id}`]

    return playerData.seasonStats.pitching.saves
  }

  async refresh() {
    const weatherDateTimeData =
        await this.fetchWeatherDateTimeData()
          .catch(() => this.cache.weatherDateTime)

    this.cache.weatherDateTime = await weatherDateTimeData

    //TODO: Implement Error Handling for nhlService

    this.cache.nhl = await nhlService.NHLRefresh()

    const gamePks = await fetchGamePks()

    const {
      livePk,
      lastPk,
      nextPk,
      postponedPk
    } = gamePks

    console.log({
      livePk,
      lastPk,
      nextPk,
      postponedPk
    })

    this.cache.viewStatus = ViewStatus.Concluded
    this.cache.postponedGame = null

    if (livePk) {
      try {
        const url = mlbEndpoints.liveFeed(livePk)
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Live game data call returned: ${response.status}`)
        }

        interface MLBPlayerBoxscoreData {
          person: {
            fullName: string
          }
          jerseyNumber?: string
          seasonStats?: {
            batting?: {
              avg?: string
            }
          }
          stats?: {
            pitching?: {
              summary?: string
              pitchesThrown?: string
            }
          }
        }

        interface MLBTeamBoxscoreData {
          teamStats: {
            batting: {
              runs: number
              hits: number
            }
            fielding: {
              errors: number
            }
          }
          players: {
            [playerId: string]: MLBPlayerBoxscoreData
          }
          pitchers: {
            [index: number]: number
          }[]
        }

        interface MLBLiveGameData {
          gamePk: number
          gameData: {
            datetime: {
              officialDate: string
              time: string
              ampm: string
            }
            status: {
              detailedState: string
            }
            teams: {
              home: {
                name: string,
                id: number
                abbreviation: string
              }
              away: {
                name: string,
                id: number
                abbreviation: string
              }
            }
          }
          liveData: {
            linescore: {
              currentInning: number
              inningState: string
              isTopInning: boolean
              innings: {
                num: number
                ordinalNum: string
                home: {
                  runs: number
                  hits: number
                  errors: number
                  leftOnBase: number
                }
                away: {
                  runs: number
                  hits: number
                  errors: number
                  leftOnBase: number
                }
              }[]
              teams: {
                home: {
                  runs?: number
                  hits?: number
                  errors?: number
                  leftOnBase: number
                }
                away: {
                  runs?: number
                  hits?: number
                  errors?: number
                  leftOnBase: number
                }
              }
              offense: {
                first?: any
                second?: any
                third?: any
                batter?: {
                  id?: number
                  fullName?: string
                }
              }
              defense: {
                pitcher?: {
                  id?: number
                  fullName?: string
                }
              }
              balls: number
              strikes: number
              outs: number
            }
            boxscore: {
              teams: {
                away: MLBTeamBoxscoreData,
                home: MLBTeamBoxscoreData,
              }
            }
          }
        }
      
        const data: MLBLiveGameData = await response.json()

        if (
          !data.gameData ||
          !data.liveData?.linescore ||
          !data.liveData.boxscore
        ) {
          throw new Error(`Incomplete live game data for gamePk ${livePk}`)
        }

        const { gameData, liveData, gamePk } = data
        const { linescore, boxscore } = liveData
        const { datetime, status } = gameData
        const { home, away } = gameData.teams

        const buildPitchingLeader = (
          side: 'home' | 'away',
          team: MLBTeamBoxscoreData
        ) => {
          const pitcherId = team.pitchers.at(-1)

          if (!pitcherId) {
              return {
                  side,
                  id: undefined
              }
          }

          const pitcher = team.players[`ID${pitcherId}`]

          return {
            side,
            id: pitcherId,
            name: pitcher?.person.fullName ?? '--',
            jerseyNumber: pitcher?.jerseyNumber ?? '--',
            stats: pitcher?.stats?.pitching?.summary ?? '--'
          }
        }

        const isTopInning = linescore.isTopInning

        const getBatterData = async (batterId?: number) => {

          if (!batterId) {

            return {
              name: '--',
              number: '##',
              average: '--',
            }
          }
          const team = isTopInning ? 'away' : 'home'
          const name = await this.fetchPlayerBoxscoreName(batterId)

          const player = boxscore.teams[team].players[`ID${batterId}`]

          return {
            name,
            number: player?.jerseyNumber ?? '##',
            average: player?.seasonStats?.batting?.avg ?? '--'
          }
        }

        const getPitcherData = async (pitcherId?: number) => {

          if (!pitcherId) {

            return {
              name: '--',
              pitchCount: '--'
            }
          }
          
          const team = !isTopInning ? 'away' : 'home'
          const name = await this.fetchPlayerBoxscoreName(pitcherId)

          const player = boxscore.teams[team].players[`ID${pitcherId}`]

          return {
            name,
            pitchCount: player?.stats?.pitching?.pitchesThrown || ' -',
          }
        }

        const count = {
          balls: linescore.balls,
          strikes: linescore.strikes,
          outs: linescore.outs
        }

        const runners = {
          first: Boolean(linescore.offense.first),
          second: Boolean(linescore.offense.second),
          third: Boolean(linescore.offense.third)
        }

        const batter = await getBatterData(linescore.offense.batter?.id)

        const pitcher = await getPitcherData(linescore.defense.pitcher?.id)

        const metaData = {
          detailedState: gameData.status.detailedState,
          date: datetime.officialDate.replaceAll('-', '/'),
          time: `${datetime.time} ${datetime.ampm}`,
          inning: linescore.currentInning,
          inningState: linescore.inningState,
          isTopInning,
          count,
          runners,
          batter,
          pitcher
        }

        const homeTeam = {
          name: home.name,
          teamId: home.id,
          score: linescore.teams.home.runs
        }

        const awayTeam = {
          name: away.name,
          teamId: away.id,
          score: linescore.teams.away.runs
        }
        
        this.cache.viewStatus = ViewStatus.In_Progress

        this.cache.currentGame = {
          status,
          gamePk,
          metaData,
          homeTeam,
          awayTeam,
        }

        const homeInnings: any = {
          teamId: home.id,
          name: home.abbreviation,
          innings: linescore.innings.map((inning: any) => inning.home.runs),
          runs: boxscore.teams.home.teamStats.batting.runs,
          hits: boxscore.teams.home.teamStats.batting.hits,
          errors: boxscore.teams.home.teamStats.fielding.errors,
        }

        const awayInnings: any = {
          teamId: away.id,
          name: away.abbreviation,
          innings: linescore.innings.map((inning: any) => inning.away.runs),
          runs: boxscore.teams.away.teamStats.batting.runs,
          hits: boxscore.teams.away.teamStats.batting.hits,
          errors: boxscore.teams.away.teamStats.fielding.errors,
        }

        this.cache.inningByInning = {
          homeInnings: homeInnings,
          awayInnings: awayInnings,
        }

        this.cache.battingLeaders = {
          home: await this.fetchBattingStats(livePk, 'home'),
          away: await this.fetchBattingStats(livePk, 'away'),
        }

        this.cache.pitchingLeaders = [
          buildPitchingLeader('home', boxscore.teams.home),
          buildPitchingLeader('away', boxscore.teams.away),
        ]
      } catch (err) {
        this.logger.error(
          {
            err,
            gamePk: livePk
          },
          'Failed to fully update current game stats. Showing previously cached data.'
        )

        return this.cache.currentGame
      }
    }

    if (lastPk && !livePk) {
      //TODO: Implement Error Handling for LASTPK
      const url = mlbEndpoints.liveFeed(lastPk)
      const response = await fetch(url)
      const data = await response.json()

      const awayWon = data.liveData.linescore.teams.away.runs > data.liveData.linescore.teams.home.runs

      this.cache.lastGame = {
        gamePk: data.gamePk,
        metaData: {
          date: this.altDate(data.gameData.datetime.officialDate)
        },
        homeTeam: {
          name: data.gameData.teams.home.name,
          score: data.liveData.linescore.teams.home.runs,
          teamId: data.gameData.teams.home.id,
          record: {
            wins: data.gameData.teams.home.record.wins,
            losses: data.gameData.teams.home.record.losses
          },
        },
        awayTeam: {
          name: data.gameData.teams.away.name,
          score: data.liveData.linescore.teams.away.runs,
          teamId: data.gameData.teams.away.id,
          record: {
            wins: data.gameData.teams.away.record.wins,
            losses: data.gameData.teams.away.record.losses
          },
        },
      }
      
      const homeInnings: any = {
        teamId: data.gameData.teams.home.id,
        name: data.gameData.teams.home.abbreviation,
        innings: data.liveData.linescore.innings.map((inning: any) => inning.home.runs),
        runs: data.liveData.boxscore.teams.home.teamStats.batting.runs,
        hits: data.liveData.boxscore.teams.home.teamStats.batting.hits,
        errors: data.liveData.boxscore.teams.home.teamStats.fielding.errors,
      }

      const awayInnings: any = {
        teamId: data.gameData.teams.away.id,
        name: data.gameData.teams.away.abbreviation,
        innings: data.liveData.linescore.innings.map((inning: any) => inning.away.runs),
        runs: data.liveData.boxscore.teams.away.teamStats.batting.runs,
        hits: data.liveData.boxscore.teams.away.teamStats.batting.hits,
        errors: data.liveData.boxscore.teams.away.teamStats.fielding.errors,
      }

      this.cache.inningByInning = {
        homeInnings: homeInnings,
        awayInnings: awayInnings,
      }

      this.cache.battingLeaders = {
        home: await this.fetchBattingStats(lastPk, 'home'),
        away: await this.fetchBattingStats(lastPk, 'away'),
      }

      const decisions = data.liveData.decisions ? {
        winner: {
          id: data.liveData.decisions.winner.id,
          name: data.liveData.decisions.winner.fullName
        },
        loser: {
          id: data.liveData.decisions.loser.id,
          name: data.liveData.decisions.loser.fullName
        },
        ...(data.liveData.decisions.save
          && {
            save: {
              id: data.liveData.decisions.save.id,
              name: data.liveData.decisions.save.fullName
            },
          }
        )
      } : null

      const decisionPitchers = decisions ? [
        {
          type: 'winner',
          side: awayWon ? 'away' : 'home',
          id: decisions.winner.id,
          name: decisions.winner.name,
          label: 'W',
          stats: await this.fetchPitcherRecord(decisions.winner.id, (awayWon ? 'away' : 'home'), data),
        },
        {
          type: 'loser',
          side: awayWon ? 'home' : 'away',
          id: decisions.loser.id,
          name: decisions.loser.name,
          label: 'L',
          stats: await this.fetchPitcherRecord(decisions.loser.id, (awayWon ? 'home' : 'away'), data),
        }
      ] : []

      if (!isEmpty(decisionPitchers) && decisions.save) {
        decisionPitchers.push({
          type: 'save',
          side: awayWon ? 'away' : 'home',
          id: decisions.save.id,
          name: decisions.save.name,
          label: 'S',
          stats: `(${await this.fetchPitcherSaves(decisions.save.id, (awayWon ? 'away' : 'home'), data)})`,
        })
      }

      this.cache.pitchingLeaders = [...decisionPitchers]
    }

    if (nextPk) {
      //TODO: Implement Error Handling for NEXTPK
      const url = mlbEndpoints.liveFeed(nextPk)
      const response = await fetch(url)
      const data = await response.json()

      const getHomePitcherData = async () => {
        const homePitcherId = data?.gameData?.probablePitchers?.home?.id
        if (homePitcherId) {
          const homePitcherUrl = mlbEndpoints.playerInfo(homePitcherId)
          const homePitcherResponse = await fetch(homePitcherUrl)
          const homePitcherResponseData = await homePitcherResponse.json()
          const homePitcherData = homePitcherResponseData.people[0]

          return {
            name: homePitcherData.boxscoreName,
            hand: homePitcherData.pitchHand.code,
            era: data.liveData.boxscore.teams.home.players[`ID${homePitcherId}`].seasonStats.pitching.era,
            wins: data.liveData.boxscore.teams.home.players[`ID${homePitcherId}`].seasonStats.pitching.wins,
            losses: data.liveData.boxscore.teams.home.players[`ID${homePitcherId}`].seasonStats.pitching.losses,
          }
        }

        return {
          name: 'n/a',
          hand: '?',
          era: '-',
          wins: '',
          losses: ''
        }
      }

      const getAwayPitcherData = async () => {
        const awayPitcherId = data?.gameData?.probablePitchers?.away?.id
        if (awayPitcherId) {
          const awayPitcherUrl = mlbEndpoints.playerInfo(awayPitcherId)
          const awayPitcherResponse = await fetch(awayPitcherUrl)
          const awayPitcherResponseData = await awayPitcherResponse.json()
          const awayPitcherData = awayPitcherResponseData.people[0]

          return {
            name: awayPitcherData.boxscoreName,
            hand: awayPitcherData.pitchHand.code,
            era: data.liveData.boxscore.teams.away.players[`ID${awayPitcherId}`].seasonStats.pitching.era,
            wins: data.liveData.boxscore.teams.away.players[`ID${awayPitcherId}`].seasonStats.pitching.wins,
            losses: data.liveData.boxscore.teams.away.players[`ID${awayPitcherId}`].seasonStats.pitching.losses,
          }
        }

        return {
          name: 'n/a',
          hand: '?',
          era: '0.00',
          wins: '',
          losses: ''
        }
      }

      this.cache.nextGame = {
        gamePk: data.gamePk,
        metaData: {
          date: this.altDate(data.gameData.datetime.officialDate),
          time: `${data.gameData.datetime.time} ${data.gameData.datetime.ampm}`
        },
        homeTeam: {
          name: data.gameData.teams.home.name,
          teamId: data.gameData.teams.home.id,
          record: {
            wins: data.gameData.teams.home.record.wins,
            losses: data.gameData.teams.home.record.losses
          },
          probablePitcher: {
            name: (await getHomePitcherData()).name,
            hand: (await getHomePitcherData()).hand,
            era: (await getHomePitcherData()).era,
            wins: (await getHomePitcherData()).wins,
            losses: (await getHomePitcherData()).losses
          }
        },
        awayTeam: {
          name: data.gameData.teams.away.name,
          score: data.liveData.linescore.teams.away.runs,
          teamId: data.gameData.teams.away.id,
          record: {
            wins: data.gameData.teams.away.record.wins,
            losses: data.gameData.teams.away.record.losses
          },
          probablePitcher: {
            name: (await getAwayPitcherData()).name,
            hand: (await getAwayPitcherData()).hand,
            era: (await getAwayPitcherData()).era,
            wins: (await getAwayPitcherData()).wins,
            losses: (await getAwayPitcherData()).losses
          }
        },
      }
    }

    if(postponedPk && !livePk) {
      //TODO: Implement Error Handling for POSTPONED
      const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=138&startDate=2026-03-25&endDate=2027-01-01`

      const response = await fetch(url)
      const data = await response.json()

      const games = data.dates
        .flatMap((date: any) => date.games)
        .sort(
          (a: any, b: any) =>
            new Date(a.gameDate).valueOf() -
            new Date(b.gameDate).valueOf()
        )
        
      const postponedGame = games.find((game: any) => game.gamePk === postponedPk && game.status.detailedState === 'Postponed')

      this.cache.postponedGame = {
        gamePk: postponedGame.gamePk,
        metaData: {
          originalDate: this.altDate(postponedGame.gameDate.split('T')[0]),
          rescheduledDate: this.altDate(postponedGame.rescheduleGameDate),
          rescheduledTime: this.getTimeFromISO(postponedGame.rescheduleDate),
          status: postponedGame.status.detailedState,
          reason: postponedGame.status.reason
        },
        homeTeam: {
          name: postponedGame.teams.home.team.name,
          teamId: postponedGame.teams.home.team.id,
          record: {
            wins: postponedGame.teams.home.leagueRecord.wins,
            losses: postponedGame.teams.home.leagueRecord.losses
          },
        },
        awayTeam: {
          name: postponedGame.teams.away.team.name,
          teamId: postponedGame.teams.away.team.id,
          record: {
            wins: postponedGame.teams.away.leagueRecord.wins,
            losses: postponedGame.teams.away.leagueRecord.losses
          },
        },
      }
    }

    const NLEast = await this.divisionStandings(204, 104, 'NL East')
    const NLCentral = await this.divisionStandings(205, 104, 'NL Central')
    const NLWest = await this.divisionStandings(203, 104, 'NL West')

    this.cache.divisionStandings= [
      NLEast,
      NLCentral,
      NLWest
    ]

    this.cache.lastUpdated = Date.now()

  }

  getGames() {

    return this.cache
  }
}
