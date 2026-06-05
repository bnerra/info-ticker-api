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
}

export class GameService {
  private cache: GamesCache = {
    viewStatus: ViewStatus.Concluded,
    currentGame: {},
    lastGame: {},
    nextGame: {}
  }

  async refresh() {
    // const currentDate = new Date().toLocaleDateString('en-CA')
    const currentDate = '2026-06-05'

    const livePk = await getLiveOrTodayGame()
    const lastPk = await getLastGamePlayed()
    const nextPk = await getNextGameScheduled()

    console.log({
      livePk,
      lastPk,
      nextPk
    })

    if (livePk) {
      // const url = mlbEndpoints.liveFeed(livePk)
      // const response = await fetch(url)
      // const data = await response.json()
      // const game = data.games[0]

    }

    if (lastPk) {
      const url = mlbEndpoints.liveFeed(lastPk)
      const response = await fetch(url)
      const data = await response.json()
      // this.cache.viewStatus = ViewStatus.Concluded,
      this.cache.viewStatus = ViewStatus.Concluded,
      this.cache.lastGame = {
        gamePk: lastPk,
        metaData: {
          date: data.gameData.datetime.officialDate,
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
      
    }

    // console.dir(this.cache, { depth: null })
    // const todaysGameStatus = todaysGroup.games[0].status.

    // const formattedGameData: GameData = {
      // gamePk: selectedGamePk,
      // homeTeam: selectedGame.teams.home.team.name,
      // awayTeam: selectedGame.teams.away.team.name,
      // homeScore: selectedGame.teams.home.score,
      // awayScore: selectedGame.teams.away.score,
    //   inning: 6,
    //   inningHalf: 'Top',
    // }


    // const data = await response.json()

    // this.cache = [formattedData]
  }

  getGames() {

    return this.cache
  }
}
