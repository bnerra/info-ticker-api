const MLBStatsAPI = require('mlb-stats-api')
import { mlbEndpoints } from '../constants/mlbEndpoints'
import { GameData } from '../types/GameData'

const mlbStats = new MLBStatsAPI()

const mlbStartDate = '2026-03-25'

export class UpcomingGameService {
  private cache: any = {}  //Make type for UpcomingGameData

  async refresh() {
    const currentDate = new Date().toLocaleDateString('en-CA')

    // const url = mlbEndpoints.liveFeed()

    const response = await fetch('https://external-provider.com/live-games')

    const formattedData: any = {
      gamePk: 1,
      metaData: {
        date: '',
        time: '',
      },
      awayTeam: {
        name: '',

      },
      homeTeam: {},
      // gamePk: selectedGame.gamePk,
      // homeTeam: selectedGame.teams.home.team.name,
      // awayTeam: selectedGame.teams.away.team.name,
      // homeScore: selectedGame.teams.home.score,
      // awayScore: selectedGame.teams.away.score,
      // inning: 6,
      // inningHalf: 'Top',
    }

    // const response = await fetch('https://external-provider.com/live-games')

    // const data = await response.json()

    this.cache = formattedData
  }

  getGames() {

    return this.cache
  }
}
