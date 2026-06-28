import { fetchNHLGamePks } from '../constants/fetchNHLGames'
import { nhlEndpoints } from '../constants/nhlEndpoints'

enum NHLViewStatus {
  In_Progress = 'inProgress',
  Upcoming = 'upcoming',
  Concluded = 'concluded'
}

export interface NHLGamesCache {
  viewStatus: NHLViewStatus
  nhlCurrentGame: any
  nhlLastGame: any
  nhlNextGame: any
}

export class NHLGameService {
  private nhlGameCache: NHLGamesCache = {
    viewStatus: NHLViewStatus.Concluded,
    nhlCurrentGame: {},
    nhlLastGame: {},
    nhlNextGame: {},
  }

  async getTeamRecord(teamAbb: number) {
    const url = nhlEndpoints.standings()
    const response = await fetch(url)
    const data = await response.json()
    const standings: any[] = data.standings

    const teamData = standings.find((team: any) => team.teamAbbrev.default === teamAbb)

    return {
      wins: teamData.wins,
      losses: teamData.losses,
      otLosses: teamData.otLosses
    }
  }

  async NHLRefresh() {

    const gameIds: any = await fetchNHLGamePks()

    const {
      // livePk,
      nhlLastId,
      // nextPk,
    } = gameIds

    console.log({
      // livePk,
      nhlLastId,
      // nextPk,
    })

    this.nhlGameCache.viewStatus = NHLViewStatus.Concluded

    // if (livePk) {
    //   const url = mlbEndpoints.liveFeed(livePk)
    //   const response = await fetch(url)
    //   const data = await response.json()


    //   this.cache.viewStatus = NHLViewStatus.In_Progress
    //   this.cache.currentGame = {
    //     status: data.gameData.status,
    //     gamePk: data.gamePk,
    //     metaData: {
    //       detailedState: data.gameData.status.detailedState,
    //       date: data.gameData.datetime.officialDate.replaceAll('-', '/'),
    //       time: `${data.gameData.datetime.time} ${data.gameData.datetime.ampm}`,
    //     },
    //     homeTeam: {
    //       name: data.gameData.teams.home.name,
    //       teamId: data.gameData.teams.home.id,
    //       score: data.liveData.linescore.teams.home.runs,
    //     },
    //     awayTeam: {
    //       name: data.gameData.teams.away.name,
    //       score: data.liveData.linescore.teams.away.runs,
    //       teamId: data.gameData.teams.away.id,
    //     },
    //   }
    // }

    if (nhlLastId) {
      const url = nhlEndpoints.boxscore(nhlLastId)
      const response = await fetch(url)
      const data = await response.json()


      this.nhlGameCache.nhlLastGame = {
        gameId: data.id,
        gameDate: data.gameDate,
        startTime: data.startTimeUTC,
        gameState: data.gameState,
        periodDescriptor: {
          ...data.periodDescriptor
          // number: data.periodDescriptor.number,
          // periodType: data.periodDescriptor.periodType,
        },
        away: {
          teamId: data.awayTeam.id,
          name: data.awayTeam.commonName.default,
          city: data.awayTeam.placeName.default,
          abbreviation: data.awayTeam.abbrev,
          score: data.awayTeam.score,
          sog: data.awayTeam.sog,
          record: {
            ...await this.getTeamRecord(data.awayTeam.abbrev)
          }
        },
        home: {
          teamId: data.homeTeam.id,
          name: data.homeTeam.commonName.default,
          city: data.homeTeam.placeName.default,
          abbreviation: data.homeTeam.abbrev,
          score: data.homeTeam.score,
          sog: data.homeTeam.sog,
          record: {
            ...await this.getTeamRecord(data.homeTeam.abbrev),
          },
        }
      }

    }

    // if (nextPk) {
    //   const url = mlbEndpoints.liveFeed(nextPk)
    //   const response = await fetch(url)
    //   const data = await response.json()


    //   this.cache.nextGame = {
    //     gamePk: data.gamePk,
    //     metaData: {
    //       date: data.gameData.datetime.officialDate,
    //       time: `${data.gameData.datetime.time} ${data.gameData.datetime.ampm}`
    //     },
    //     homeTeam: {
    //       name: data.gameData.teams.home.name,
    //       teamId: data.gameData.teams.home.id,
    //       record: {
    //         wins: data.gameData.teams.home.record.wins,
    //         losses: data.gameData.teams.home.record.losses
    //       },
    //     },
    //     awayTeam: {
    //       name: data.gameData.teams.away.name,
    //       score: data.liveData.linescore.teams.away.runs,
    //       teamId: data.gameData.teams.away.id,
    //       record: {
    //         wins: data.gameData.teams.away.record.wins,
    //         losses: data.gameData.teams.away.record.losses
    //       },
    //     },
    //   }
    // }

    return this.nhlGameCache

  }
}
