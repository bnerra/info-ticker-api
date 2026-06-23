import { fetchGamePks } from '../constants/fetchGames'
import { mlbTeams } from '../constants/mlbData'
import { mlbEndpoints } from '../constants/mlbEndpoints'
import { weatherCodeMap } from '../constants/weatherCodeMap'

const mockStandings: any = [
    { abbreviation: 'CHC', wins: 99, losses: 26, gamesBack: 5 },
    { abbreviation: 'MIL', wins: 99, losses: 21, gamesBack: '-' },
    { abbreviation: 'CIN', wins: 99, losses: 30, gamesBack: 9.0 },
    { abbreviation: 'STL', wins: 99, losses: 22, gamesBack: 1.5 },
    { abbreviation: 'PIT', wins: 99, losses: 27, gamesBack: 6 }
  ]

enum ViewStatus {
  In_Progress = 'IN_PROGRESS',
  Upcoming = 'UPCOMING',
  Concluded = 'CONCLUDED'
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
}

export class GameService {
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
    pitchingLeaders: []
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

  async fetchWeatherDateTimeData() {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=38.79&longitude=-90.63&current=temperature_2m,wind_speed_10m,cloud_cover,weather_code&hourly=precipitation_probability&temperature_unit=fahrenheit&wind_speed_unit=mph'
    const responses = await fetch(url)
    const response = await responses.json()

    const weatherCode = response.current.weather_code

    const date = new Date()

    const data = {
      temperature: `${Math.round(response.current.temperature_2m)}\u00B0F`,
      weatherCode,
      forecast: weatherCodeMap[weatherCode] ?? '',
      date: new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        month: 'short',
        day: '2-digit'
      })
      .format(date),
      time: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    return data
  }

  async fetchBattingStats(gamePk: number, team: string) {
    const url = `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`
    const responses = await fetch(url)
    const response = await responses.json()

    const players = Object.values(response.teams[team].players)
    const batters = players.filter((player: any) => Object.keys(player.stats.batting).length > 0)

    const battingLeaders = batters.sort((a: any, b: any): any => {
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
      hr: player.stats.batting?.homeruns ?? 0,
      summary: player.stats.batting?.summary ?? '',
    }))
      .slice(0, 3)
    
    return filteredLeaders
  }

  async divisionStandings(divisionId: number, leagueId: number) {
    const url = mlbEndpoints.divisionStandings(divisionId, leagueId)
    const response = await fetch(url)
    const data = await response.json()

    const NL_Central: any = data.records.find((record: any) => record.division.id === divisionId)

    const standings = NL_Central.teamRecords.map((team: any) => ({
      teamId: team.team.id,
      divisionRank: team.divisionRank,
      wins: team.wins,
      losses: team.losses,
      gamesBack: team.gamesBack,
    }))

    return {
      divisionName: 'NL Central',
      standings: standings || mockStandings,
    }
  }

  async playerInfo(playerId: number) {
    const url = mlbEndpoints.playerInfo(playerId)
    const response = await fetch(url)
    const responseData = await response.json()

    return responseData.people[0]
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
    const weatherDateTimeData = await this.fetchWeatherDateTimeData()

    this.cache.weatherDateTime = await weatherDateTimeData

    const gamePks = await fetchGamePks()

    const {
      livePk,
      lastPk,
      nextPk
    } = gamePks

    console.log({
      livePk,
      lastPk,
      nextPk
    })

    this.cache.viewStatus = ViewStatus.Concluded

    if (livePk) {
      const url = mlbEndpoints.liveFeed(livePk)
      const response = await fetch(url)
      const data = await response.json()
      const isTopInning = data.liveData.linescore.isTopInning

      const getBatterData = async (batterId: number) => {
        const team = isTopInning ? 'away' : 'home'
        const playerString = `ID${batterId}`
        const playerInfo = await this.playerInfo(batterId)

        const players = data.liveData.boxscore.teams[team].players

        return {
          name: playerInfo.boxscoreName,
          number: players[playerString]?.jerseyNumber || '#',
          average: data?.liveData?.boxscore?.teams[team]?.players[`ID${batterId}`]?.seasonStats.batting.avg || '',
        }
      }

      const getPitcherData = async (pitcherId: number) => {
        
        const team = !isTopInning ? 'away' : 'home'
        const playerInfo = await this.playerInfo(pitcherId)

        return {
          name: playerInfo.boxscoreName,
          pitchCount: data?.liveData?.boxscore?.teams[team]?.players[`ID${pitcherId}`]?.stats.pitching.pitchesThrown || ' -',
        }
      }

      // console.log({
      //   balls: data.liveData.linescore.balls,
      //   strikes: data.liveData.linescore.strikes,
      //   outs: data.liveData.linescore.outs,
      // })

      this.cache.viewStatus = ViewStatus.In_Progress
      this.cache.currentGame = {
        status: data.gameData.status,
        gamePk: data.gamePk,
        metaData: {
          detailedState: data.gameData.status.detailedState,
          date: data.gameData.datetime.officialDate.replaceAll('-', '/'),
          time: `${data.gameData.datetime.time} ${data.gameData.datetime.ampm}`,
          inning: data.liveData.linescore.currentInning,
          inningState: data.liveData.linescore.inningState,
          isTopInning,
          count: {
            balls: data.liveData.linescore.balls,
            strikes: data.liveData.linescore.strikes,
            outs: data.liveData.linescore.outs,
          },
          runners: {
            first: !!data.liveData.linescore.offense.first,
            second: !!data.liveData.linescore.offense.second,
            third: !!data.liveData.linescore.offense.third,
          },
          batter: {...await getBatterData(data.liveData.linescore.offense.batter.id)},
          pitcher: {...await getPitcherData(data.liveData.linescore.defense.pitcher.id)}
        },
        homeTeam: {
          name: data.gameData.teams.home.name,
          teamId: data.gameData.teams.home.id,
          score: data.liveData.linescore.teams.home.runs,
        },
        awayTeam: {
          name: data.gameData.teams.away.name,
          score: data.liveData.linescore.teams.away.runs,
          teamId: data.gameData.teams.away.id,
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
        home: await this.fetchBattingStats(livePk, 'home'),
        away: await this.fetchBattingStats(livePk, 'away'),
      }
    }

    if (lastPk && !livePk) {
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

      const decisions = {
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
      }

      const decisionPitchers = [
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
      ]

      if (decisions.save) {
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
      const url = mlbEndpoints.liveFeed(nextPk)
      const response = await fetch(url)
      const data = await response.json()

      const homePitcherId = data.gameData.probablePitchers.home.id
      const homePitcherUrl = mlbEndpoints.playerInfo(homePitcherId)
      const homePitcherResponse = await fetch(homePitcherUrl)
      const homePitcherResponseData = await homePitcherResponse.json()
      const homePitcherData = homePitcherResponseData.people[0]

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
          // date: data.gameData.datetime.officialDate.replaceAll('-', '/'),
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
            // name: homePitcherData.boxscoreName,
            // hand: homePitcherData.pitchHand.code,
            // era: data.liveData.boxscore.teams.home.players[`ID${homePitcherId}`].seasonStats.pitching.era,
            // wins: data.liveData.boxscore.teams.home.players[`ID${homePitcherId}`].seasonStats.pitching.wins,
            // losses: data.liveData.boxscore.teams.home.players[`ID${homePitcherId}`].seasonStats.pitching.losses,
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
            // name: awayPitcherData.boxscoreName,
            // hand: awayPitcherData.pitchHand.code,
            name: (await getAwayPitcherData()).name,
            hand: (await getAwayPitcherData()).hand,
            // era: data.liveData.boxscore.teams.away.players[`ID${awayPitcherId}`].seasonStats.pitching.era,
            // wins: data.liveData.boxscore.teams.away.players[`ID${awayPitcherId}`].seasonStats.pitching.wins,
            // losses: data.liveData.boxscore.teams.away.players[`ID${awayPitcherId}`].seasonStats.pitching.losses,
            era: (await getAwayPitcherData()).era,
            wins: (await getAwayPitcherData()).wins,
            losses: (await getAwayPitcherData()).losses
          }
        },
      }
    }

    this.cache.divisionStandings = await this.divisionStandings(205, 104)

    // TODO: HELPER FUNCTION RELOCATE
    const addAbbreviation = (values: any[]) => {
      const abbMap = new Map(
        mlbTeams.map((item: any) => [item.appId, item.abbreviation])
      )

      return values.map((team: any) => ({
        ...team,
        abbreviation: abbMap.get(team.teamId)
      }))
    }


    this.cache.lastUpdated = Date.now()


  }

  getGames() {

    return this.cache
  }
}
