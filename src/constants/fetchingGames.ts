import { mlbEndpoints } from "./mlbEndpoints";

// Base parameters for the St. Louis Cardinals in 2026
const TEAM_ID = 138;
const SPORT_ID = 1;
const TODAY_STR = "2026-06-04"; 
const YESTERDAY_STR = "2026-06-03";
const SEASON_START = "2026-03-01";
const SEASON_END = "2026-10-01";

/**
 * Helper function to safely extract the first game object from the API response
 */
function extractFirstGame(data: any) {
    if (data && data.dates && data.dates.length > 0 && data.dates[0].games && data.dates[0].games.length > 0) {
        return data.dates[0].games[0];
    }
    return null;
}

function extractLastGame(data: any) {
    if (data && data.dates && data.dates.length > 0) {
        // Get the most recent date entry (the last item in the dates array)
        const lastDateEntry = data.dates[data.dates.length - 1];
        
        if (lastDateEntry.games && lastDateEntry.games.length > 0) {
            // Get the last game played on that specific date
            return lastDateEntry.games[lastDateEntry.games.length - 1];
        }
    }
    return null;
}

/**
 * 1. Fetch Today's / Live Game
 */
export async function getLiveOrTodayGame() {
    // const url = `https://mlb.com{SPORT_ID}&teamId=${TEAM_ID}&date=${TODAY_STR}&hydrate=linescore`;
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=138&date=2026-06-05&hydrate=linescore`
    try {
        const response = await fetch(url);
        const data = await response.json();
        const game = extractFirstGame(data);
        
        if (!game) {
            console.log("No game scheduled for the Cardinals today.");
            return;
        }

        const state = game.status.codedGameState; // 'I' for In Progress, 'S' for Scheduled, etc.
        // console.log(`\n--- TODAY'S GAME STATUS: [${game.status.detailedState}] ---`);
        // console.log(`${game.teams.away.team.name} @ ${game.teams.home.team.name}`);
        
        if (state === 'I') {

          return game.gamePk
            // console.log(`Live Score: Away ${game.linescore.teams.away.runs} - Home ${game.linescore.teams.home.runs}`);
            // console.log(`Current Inning: ${game.linescore.currentInningState} ${game.linescore.currentInningOrdinal}`);
        } else {

          return null
            // console.log(`Game is not currently live. Current status code: ${state}`);
        }
    } catch (error) {
        console.error("Error fetching today's game:", error);
    }
}

/**
 * 2. Fetch Last Game Played (Looking back from yesterday)
 */
export async function getLastGamePlayed() {
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=138&startDate=2026-03-25&endDate=2026-06-04`

    // const url = `https://mlb.com{SPORT_ID}&teamId=${TEAM_ID}&startDate=${SEASON_START}&endDate=${YESTERDAY_STR}&limit=1&hydrate=decisions`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const game = extractLastGame(data);

        if (game) {

          return game.gamePk
            // console.log(`\n--- LAST GAME PLAYED ---`);
            // console.log(`Date: ${game.gameDate}`);
            // console.log(`${game.teams.away.team.name} vs ${game.teams.home.team.name}`);
            // console.log(`Status: ${game.status.detailedState}`);
            // if (game.decisions) {
            //     console.log(`Winning Pitcher ID: ${game.decisions.winner?.id || 'N/A'}`);
            // }
        } else {
            console.log("No past games found in the specified window.");

            return null
        }
    } catch (error) {
        console.error("Error fetching last game:", error);
    }
}

/**
 * 3. Fetch Next Game Scheduled (Looking forward from today)
 */
export async function getNextGameScheduled() {
    // const url = `https://mlb.com{SPORT_ID}&teamId=${TEAM_ID}&startDate=${TODAY_STR}&endDate=${SEASON_END}&limit=1&hydrate=team`;
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=138&startDate=2026-06-05&endDate=2027-01-01`
    try {
        const response = await fetch(url)
        const data = await response.json()
        const game = extractFirstGame(data)

        if (game) {

          // console.dir(game, { depth: null })

          return game.gamePk
            // console.log(`\n--- NEXT SCHEDULED GAME ---`);
            // console.log(`Date/Time: ${game.gameDate}`);
            // console.log(`${game.teams.away.team.name} @ ${game.teams.home.team.name}`);
            // console.log(`Status: ${game.status.detailedState}`);
        } else {
            console.log("No upcoming games found.");

            return null
        }
    } catch (error) {
        console.error("Error fetching next game:", error);
    }
}

// Execute all wrapper functions
async function runCardinalsDashboard() {
    await getLiveOrTodayGame();
    await getLastGamePlayed();
    await getNextGameScheduled();
}

runCardinalsDashboard();
