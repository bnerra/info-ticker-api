const TEAM_ID = 138;
const SPORT_ID = 1;
const TODAY_STR = new Date().toLocaleDateString('en-CA')
// const YESTERDAY_STR = "2026-06-03";
const SEASON_START = "2026-03-01";
const SEASON_END = "2026-10-01"


export const fetchGamePks = async () => {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${TEAM_ID}&startDate=2026-03-25&endDate=2027-01-01`
  const response = await fetch(url)
  const data = await response.json()
  const schedule: any = data.dates
  const allGames: any = schedule.flatMap((date: any) => date.games)
  const now = new Date()

  const games = allGames.sort(
    (a: any, b: any) =>
      new Date(a.gameDate).valueOf() - new Date(b.gameDate).valueOf()
  )

  let currentGamePk = null
  let lastCompletedGamePk = null
  let nextGamePk = null

  for (const game of games) {
    const state = game.status.abstractGameState

    if (state === 'Live') {
      currentGamePk = game.gamePk
    }

    if (state === 'Final') {
      lastCompletedGamePk = game.gamePk
    }

    if (!nextGamePk && state === 'Preview') {
      nextGamePk = game.gamePk
    }
  }

  return {
    livePk: currentGamePk,
    lastPk: lastCompletedGamePk,
    nextPk: nextGamePk
  }

  // console.log({games})

  // return data

  // const currentGame = data.find((game: any) => game.status.abstractGameState === 'Live')
}