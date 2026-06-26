
// 1.
// export const fetchGamePks = async () => {
//   const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${TEAM_ID}&startDate=2026-03-25&endDate=2027-01-01`

//   const response = await fetch(url)
//   const data = await response.json()

//   const games = data.dates
//     .flatMap((date: any) => date.games)
//     .sort(
//       (a: any, b: any) =>
//         new Date(a.gameDate).valueOf() -
//         new Date(b.gameDate).valueOf()
//     )

//   let livePk: number | null = null
//   let lastPk: number | null = null
//   let nextPk: number | null = null
//   let postponedPk: number | null = null

//   const now = Date.now()

//   for (const game of games) {
//     const { detailedState } = game.status
//     const gameTime = new Date(game.gameDate).getTime()

//     switch (detailedState) {
//       case 'Final':
//         lastPk = game.gamePk
//         break

//       case 'Postponed':
//         postponedPk = game.gamePk
//         break

//       case 'In Progress':
//       case 'Manager Challenge':
//       case 'Delayed':
//         livePk = game.gamePk

//         // Once another game has started, the postponement
//         // is no longer "current".
//         postponedPk = null
//         break

//       case 'Scheduled':
//       case 'Pre-Game':
//         if (!nextPk && gameTime >= now) {
//           nextPk = game.gamePk
//         }
//         break
//     }
//   }

//   return {
//     livePk,
//     lastPk,
//     nextPk,
//     postponedPk
//   }
// }

// let postponedGameDate = 0;

// case 'Postponed':
//   if (gameTime > postponedGameDate) {
//     postponedGameDate = gameTime;
//     postponedPk = game.gamePk;
//   }
//   break;

// {
//   mode: 'LIVE' | 'PRE_GAME' | 'POSTPONED' | 'OFF_DAY',
//   livePk,
//   lastPk,
//   nextPk,
//   postponedPk
// }

// 2.
// export const fetchGamePks = async () => {
//   const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${TEAM_ID}&startDate=2026-03-25&endDate=2027-01-01`

//   const response = await fetch(url)
//   const data = await response.json()

//   const games = data.dates
//     .flatMap((date: any) => date.games)
//     .sort(
//       (a: any, b: any) =>
//         new Date(a.gameDate).valueOf() -
//         new Date(b.gameDate).valueOf()
//     )

//   let livePk: number | null = null
//   let lastPk: number | null = null
//   let nextPk: number | null = null
//   let postponedPk: number | null = null

//   // Track the most recent postponed game
//   let postponedGameDate = 0

//   // Track whether a game is currently live
//   let hasLiveGame = false

//   const now = Date.now()

//   for (const game of games) {
//     const { detailedState } = game.status
//     const gameTime = new Date(game.gameDate).getTime()

//     switch (detailedState) {
//       case 'Final':
//         lastPk = game.gamePk
//         break

//       case 'Postponed':
//         // Keep only the most recent postponed game
//         if (gameTime > postponedGameDate) {
//           postponedGameDate = gameTime
//           postponedPk = game.gamePk
//         }
//         break

//       case 'In Progress':
//       case 'Manager Challenge':
//       case 'Delayed':
//         hasLiveGame = true
//         livePk = game.gamePk
//         break

//       case 'Scheduled':
//       case 'Pre-Game':
//         if (!nextPk && gameTime >= now) {
//           nextPk = game.gamePk
//         }
//         break
//     }
//   }

//   // Once another game has started, stop exposing the postponed game.
//   if (hasLiveGame) {
//     postponedPk = null
//   }

//   return {
//     livePk,
//     lastPk,
//     nextPk,
//     postponedPk
//   }
// }

// const LIVE_STATES = ['In Progress', 'Manager Challenge', 'Delayed']
// const UPCOMING_STATES = ['Scheduled', 'Pre-Game']
