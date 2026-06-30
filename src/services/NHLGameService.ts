import { isEmpty } from 'lodash'
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
  forwardLeaders: any
  defenseLeaders: any
  goalieSummary: any
  periodByPeriod: any
}

export class NHLGameService {
  private nhlGameCache: NHLGamesCache = {
    viewStatus: NHLViewStatus.Concluded,
    nhlCurrentGame: {},
    nhlLastGame: {},
    nhlNextGame: {},
    forwardLeaders: {},
    defenseLeaders: {},
    goalieSummary: {},
    periodByPeriod: {}
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

  formatStatSummary(player: any): string {
    const goals = `${player.goals}G`
    const assists = `${player.assists}A`
    const points = `${player.points}pts`
    const sog = `${player.sog}sog`

    return `${goals} ${assists} ${points} ${sog}`
  }

  async fetchForwardStats(forwards: any[]) {

    const forwardLeaders = forwards.sort((a: any, b: any): any => {

      return (
        (b.points ?? 0) - (a.points ?? 0) ||
        (b.goals ?? 0) - (a.goals ?? 0) ||
        (b.assists ?? 0) - (a.assists ?? 0) ||
        (b.sog ?? 0) - (a.sog ?? 0)
      )
    })

    const filteredLeaders = forwardLeaders.map((player: any) => ({
      name: player.name.default,
      goals: player.goals ?? 0,
      assists: player.assists ?? 0,
      points: player.points ?? 0,
      sog: player.sog ?? 0,
      toi: player.toi ?? '00:00',
    }))
      .slice(0, 3)

    const formattedLeaders = filteredLeaders.map((player: any) => ({
      ...player,
      summary: this.formatStatSummary(player)
    }))
    
    return formattedLeaders
  }

  async fetchDefenderStats(defenders: any[]) {

    const defenseLeaders = defenders.sort((a: any, b: any): any => {

      return (
        (b.points ?? 0) - (a.points ?? 0) ||
        (b.goals ?? 0) - (a.goals ?? 0) ||
        (b.assists ?? 0) - (a.assists ?? 0) ||
        (b.sog ?? 0) - (a.sog ?? 0) ||
        (b.blockedShots ?? 0) - (a.blockedShots ?? 0)
      )
    })

    const filteredLeaders = defenseLeaders.map((player: any) => ({
      name: player.name.default,
      goals: player.goals ?? 0,
      assists: player.assists ?? 0,
      points: player.points ?? 0,
      sog: player.sog ?? 0,
      toi: player.toi ?? '00:00',
    }))
      .slice(0, 3)

    const formattedLeaders = filteredLeaders.map((player: any) => ({
      ...player,
      summary: this.formatStatSummary(player)
    }))
    
    return formattedLeaders
  }

  formatGoalieStatSummary(player: any): string {

    return `${player.saves}/${player.shotsAgainst} ${player.goalsAgainst}GA ${player.savePctg}(SV%)`
  }

  async fetchGoalieStats(goalies: any[]) {

    const forwardLeaders = goalies.sort((a: any, b: any): any => {

      return (
        (a.goalsAgainst ?? 0) - (b.goalsAgainst ?? 0) ||
        (b.savePctg ?? 0) - (a.savePctg ?? 0) ||
        (b.shotsAgainst ?? 0) - (a.shotsAgainst ?? 0) ||
        (b.toi ?? 0) - (a.toi ?? 0)
      )
    })

    const filteredLeaders = forwardLeaders.map((player: any) => ({
      name: player.name.default,
      goalsAgainst: player.goalsAgainst ?? 0,
      shotsAgainst: player.shotsAgainst ?? 0,
      saves: player.saves ?? 0,
      savePctg: player.savePctg && player.savePctg.toFixed(3) || '0.0',
      toi: player.toi ?? '00:00',
    })).filter((player: any) => player.toi !== '00:00')

    const formattedLeaders = filteredLeaders.map((player: any) => ({
      ...player,
      summary: this.formatGoalieStatSummary(player)
    }))
    
    return formattedLeaders
  }

  
  async getPeriodScoringSummary(summary: any, awayName: string, homeName: string){
    const scoring = summary.scoring
    const homeScore: number[] = []
    const awayScore: number[] = []
    const lastPeriod = scoring.at(-1)
    let shootoutSummary = {}

    for (const period of scoring ?? []) {
      let homeGoals = 0
      let awayGoals = 0

      for (const goal of period.goals ?? []) {
        if (goal.isHome) {
          homeGoals++
        } else {
          awayGoals++
        }
      }

      homeScore.push(homeGoals)
      awayScore.push(awayGoals)
    }

    if (summary.shootout) {
      shootoutSummary = {
        home: summary.shootout.liveScore.home,
        away: summary.shootout.liveScore.away,
        rounds: summary.shootout.events.length / 2
      }
    }

    return {
      type: lastPeriod.periodDescriptor.periodType,
      ...(!isEmpty(shootoutSummary) && {shootoutSummary}),
      home: {
        name: homeName,
        score: homeScore
      },
      away: {
        name: awayName,
        score: awayScore
      }
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

      const gameUrl = nhlEndpoints.liveFeed(nhlLastId)
      const gameResponse = await fetch(gameUrl)
      const gameData = await gameResponse.json()


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

      this.nhlGameCache.forwardLeaders = {
        away: await this.fetchForwardStats(data.playerByGameStats.awayTeam.forwards),
        home: await this.fetchForwardStats(data.playerByGameStats.homeTeam.forwards)
      }

      this.nhlGameCache.defenseLeaders = {
        away: await this.fetchDefenderStats(data.playerByGameStats.awayTeam.defense),
        home: await this.fetchDefenderStats(data.playerByGameStats.homeTeam.defense)
      }

      this.nhlGameCache.goalieSummary = {
        away: await this.fetchGoalieStats(data.playerByGameStats.awayTeam.goalies),
        home: await this.fetchGoalieStats(data.playerByGameStats.homeTeam.goalies)
      }

      this.nhlGameCache.periodByPeriod = {
        ... await this.getPeriodScoringSummary(gameData.summary, gameData.awayTeam.abbrev, gameData.homeTeam.abbrev)
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
