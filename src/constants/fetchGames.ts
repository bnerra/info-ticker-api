const TEAM_ID = 138;
const SPORT_ID = 1;
const TODAY_STR = new Date().toLocaleDateString('en-CA')
// const YESTERDAY_STR = "2026-06-03";
const SEASON_START = "2026-03-01";
const SEASON_END = "2026-10-01"

const status = {
  abstractGameState: 'Final',
  codedGameState: 'D',
  detailedState: 'Postponed',
  statusCode: 'DI',
  startTimeTBD: false,
  reason: 'Inclement Weather',
  abstractGameCode: 'F'
}

export const fetchGamePks = async () => {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${TEAM_ID}&startDate=2026-03-25&endDate=2027-01-01`

  const response = await fetch(url)
  const data = await response.json()

  const games = data.dates
    .flatMap((date: any) => date.games)
    .sort(
      (a: any, b: any) =>
        new Date(a.gameDate).valueOf() -
        new Date(b.gameDate).valueOf()
    )

  let livePk: number | null = null
  let lastPk: number | null = null
  let nextPk: number | null = null
  let postponedPk: number | null = null

  // Track the most recent postponed game
  let postponedGameDate = 0

  // Track whether a game is currently live
  let hasLiveGame = false

  const now = Date.now()

  for (const game of games) {
    const { detailedState } = game.status
    const gameTime = new Date(game.gameDate).getTime()

    switch (detailedState) {
      case 'Final':
        lastPk = game.gamePk
        break

      case 'Postponed':
        // Keep only the most recent postponed game
        if (gameTime > postponedGameDate) {
          postponedGameDate = gameTime
          postponedPk = game.gamePk
        }
        break

      case 'In Progress':
      case 'Manager Challenge':
      case 'Delayed':
        hasLiveGame = true
        livePk = game.gamePk
        break

      case 'Scheduled':
      case 'Pre-Game':
        if (!nextPk && gameTime >= now) {
          nextPk = game.gamePk
        }
        break
    }
  }

  // Once another game has started, stop exposing the postponed game.
  if (hasLiveGame) {
    postponedPk = null
  }

  return {
    livePk,
    lastPk,
    nextPk,
    postponedPk
  }
}


// export const fetchGamePks = async () => {
//   const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${TEAM_ID}&startDate=2026-03-25&endDate=2027-01-01`
//   const response = await fetch(url)
//   const data = await response.json()
//   const schedule: any = data.dates
//   const allGames: any = schedule.flatMap((date: any) => date.games)

//   const games = allGames.sort(
//     (a: any, b: any) =>
//       new Date(a.gameDate).valueOf() - new Date(b.gameDate).valueOf()
//   )

//   let currentGamePk = null
//   let lastCompletedGamePk = null
//   let nextGamePk = null

//   for (const game of games) {
//     const state = game.status.abstractGameState

//     if (state === 'Live') {
//       currentGamePk = game.gamePk
//     }

//     if (state === 'Final') {
//       lastCompletedGamePk = game.gamePk
//     }

//     if (!nextGamePk && state === 'Preview') {
//       nextGamePk = game.gamePk
//     }
//   }

//   return {
//     livePk: currentGamePk,
//     lastPk: lastCompletedGamePk,
//     nextPk: nextGamePk
//   }
// }