
export const fetchNHLGamePks = async () => {
  const url = 'https://api-web.nhle.com/v1/club-schedule-season/STL/20252026'
  const response = await fetch(url)
  const data = await response.json()

  const games = data.games
      .sort(
        (a: any, b: any) =>
          new Date(a.gameDate).valueOf() -
          new Date(b.gameDate).valueOf()
      )

    // console.dir(games, { depth: null })

  // let livePk: number | null = null
  let nhlLastId: number | null = null
  // let nextPk: number | null = null
  // let postponedPk: number | null = null

  // Track the most recent postponed game
  // let postponedGameDate = 0

  // Track whether a game is currently live
  // let hasLiveGame = false

  // const now = Date.now()

  for (const game of games) {
    const { gameState } = game
    // const gameTime = new Date(game.gameDate).getTime()

    switch (gameState) {
      case 'FINAL':
      case 'OVER':
      case 'OFF':
        nhlLastId = game.id
        // nhlLastId = 2025021042
        break

      // case 'Postponed':
      //   // Keep only the most recent postponed game
      //   if (gameTime > postponedGameDate) {
      //     postponedGameDate = gameTime
      //     postponedPk = game.gamePk
      //   }
      //   break

      // case 'In Progress':
      // case 'Manager Challenge':
      // case 'Delayed':
      //   hasLiveGame = true
      //   livePk = game.gamePk
      //   break

      // case 'Scheduled':
      // case 'Pre-Game':
      //   if (!nextPk && gameTime >= now) {
      //     nextPk = game.gamePk
      //   }
      //   break
    }
  }

  // Once another game has started, stop exposing the postponed game.
  // if (hasLiveGame) {
  //   postponedPk = null
  // }

  // if (now > (postponedGameDate + 86400000)) {
  //   postponedPk = null
  // }

  return {
    // livePk,
    nhlLastId,
    // nextPk,
    // postponedPk
  }
}
