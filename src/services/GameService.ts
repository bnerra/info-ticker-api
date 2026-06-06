import { getLastGamePlayed, getLiveOrTodayGame, getNextGameScheduled } from '../constants/fetchingGames'
import { mlbEndpoints } from '../constants/mlbEndpoints'
import { GameData } from '../types/GameData'
import { ScheduleService } from './ScheduleService'

const scheduleService = new ScheduleService()

enum ViewStatus {
  In_Progress = 'IN_PROGRESS',
  Upcoming = 'UPCOMING',
  Concluded = 'CONCLUDED'
}

export interface GamesCache {
  viewStatus: ViewStatus
  currentGame: any
  lastGame: any
  nextGame: any
  secondary: any
}

export class GameService {
  private cache: GamesCache = {
    viewStatus: ViewStatus.Concluded,
    currentGame: {},
    lastGame: {},
    nextGame: {},
    secondary: {
      divisionStanding: {}
    }
  }

  async playerInfo(playerId: number) {
    const url = mlbEndpoints.playerInfo(playerId)
    const response = await fetch(url)
    const responseData = await response.json()

    return responseData.people[0]
  }

  async refresh() {
    const livePk = await getLiveOrTodayGame()
    const lastPk = await getLastGamePlayed()
    const nextPk = await getNextGameScheduled()

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
        console.log({batterId})
        const team = isTopInning ? 'away' : 'home'
        const playerString = `ID${batterId}`
        const playerInfo = await this.playerInfo(batterId)

        return {
          name: 'Slugger',
          number: 52,
          average: '.347',
          // name: playerInfo.boxscoreName,
          // number: data.liveData.boxscore.teams[team].players[`ID${batterId}`].jerseyNumber,
          // average: data.liveData.boxscore.teams[team].players[`ID${batterId}`].seasonStats.batting.avg,
        }
      }

      const getPitcherData = async (pitcherId: number) => {
        
        const team = !isTopInning ? 'away' : 'home'
        const playerString = `ID${pitcherId}`
        const playerInfo = await this.playerInfo(pitcherId)
        console.log({pitcherId, team})

        // const test = data.liveData.boxscore.teams[team].players.ID664208

        // console.log({test})

        return {
          // name: playerInfo.boxscoreName,
          // pitchCount: data.liveData.boxscore.teams[team].players[`ID${pitcherId}`].stats.pitching.pitchesThrown,
          name: 'Aguerro',
          pitchCount: 37,
        }
      }

      console.log({
        balls: data.liveData.linescore.balls,
            strikes: data.liveData.linescore.strikes,
            outs: data.liveData.linescore.outs,
      })

      this.cache.viewStatus = ViewStatus.In_Progress
      this.cache.currentGame = {
        gamePk: data.gamePk,
        metaData: {
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
    }

    if (lastPk) {
      const url = mlbEndpoints.liveFeed(lastPk)
      const response = await fetch(url)
      const data = await response.json()

      this.cache.lastGame = {
        gamePk: data.gamePk,
        metaData: {
          date: data.gameData.datetime.officialDate.replaceAll('-', '/'),
        },
        homeTeam: {
          name: data.gameData.teams.home.name,
          score: data.liveData.linescore.teams.home.runs,
          teamId: data.gameData.teams.home.id,
          record: {
            wins: data.gameData.teams.home.record.wins,
            losses: data.gameData.teams.home.record.losses
          }
        },
        awayTeam: {
          name: data.gameData.teams.away.name,
          score: data.liveData.linescore.teams.away.runs,
          teamId: data.gameData.teams.away.id,
          record: {
            wins: data.gameData.teams.away.record.wins,
            losses: data.gameData.teams.away.record.losses
          }
        },
      }
      // const game = data.games[0]

      // console.dir(data, { depth: null })
      
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

      const awayPitcherId = data.gameData.probablePitchers.away.id
      const awayPitcherUrl = mlbEndpoints.playerInfo(awayPitcherId)
      const awayPitcherResponse = await fetch(awayPitcherUrl)
      const awayPitcherResponseData = await awayPitcherResponse.json()
      const awayPitcherData = awayPitcherResponseData.people[0]

      this.cache.nextGame = {
        gamePk: data.gamePk,
        metaData: {
          date: data.gameData.datetime.officialDate.replaceAll('-', '/'),
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
            name: homePitcherData.boxscoreName,
            hand: homePitcherData.pitchHand.code,
            era: data.liveData.boxscore.teams.home.players[`ID${homePitcherId}`].seasonStats.pitching.era,
            wins: data.liveData.boxscore.teams.home.players[`ID${homePitcherId}`].seasonStats.pitching.wins,
            losses: data.liveData.boxscore.teams.home.players[`ID${homePitcherId}`].seasonStats.pitching.losses,
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
            name: awayPitcherData.boxscoreName,
            hand: awayPitcherData.pitchHand.code,
            era: data.liveData.boxscore.teams.away.players[`ID${awayPitcherId}`].seasonStats.pitching.era,
            wins: data.liveData.boxscore.teams.away.players[`ID${awayPitcherId}`].seasonStats.pitching.wins,
            losses: data.liveData.boxscore.teams.away.players[`ID${awayPitcherId}`].seasonStats.pitching.losses,
          }
        },
      }
    }

  }

  getGames() {

    return this.cache
  }
}
