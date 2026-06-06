import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { GameService } from './services/GameService'
import { SseManager } from './services/SseManager'
import sseRoutes from './routes/sse'

const MLBStatsAPI = require('mlb-stats-api')

const app: FastifyInstance = fastify({ logger: true })

const mlbStats = new MLBStatsAPI()
const gameService = new GameService()
const sseManager = new SseManager()

app.register(sseRoutes)

interface Item {
  id: string;
  name: string;
}

let items: Item[] = [
  { id: '1', name: 'Item One' }
]

// GET all items
// app.get('/team', async (request, reply: FastifyReply) => {
//   try {
    
//     const teamData = {
//       team,
//       teamRoster,
//       leagueStandings,
//       teamStats,
//     }

//     return reply.status(201).send(teamData)

//   } catch (error) {
//     console.error('ERROR FETCHING TEAM STATS: ', error)
//   }
// });

app.get('/api/live-games', async (request, reply) => {
  reply.raw.setHeader(
    'Content-Type',
    'text/event-stream'
  )

  reply.raw.setHeader(
    'Cache-Control',
    'no-cache'
  )

  reply.raw.setHeader(
    'Connection',
    'keep-alive'
  )

  reply.raw.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  )

  reply.raw.flushHeaders()

  sseManager.addClient(reply.raw)

  reply.raw.write(
    `data: ${JSON.stringify(gameService.getGames())}\n\n`
  )

  return reply
})

// DEBUGGING

app.get('/api/games', async () => {

  return gameService.getGames()
})

// GET single item
app.get('/items/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
  try {
    const { id } = request.params
    // const CARDINALS_ID = 138
    const team = await mlbStats.getTeam({
      pathParams: { teamId: id}
    })
    const teamRoster = await mlbStats.getTeamRoster({
      pathParams: { teamId: id },
      params: { rosterType: 'active' }
    })
    const currentDate = new Date().toLocaleDateString('en-CA')
    // console.log('DATE: ', currentDate)
    const AL_LEAGUE_ID = 103
    const AL_EASTERN_DIVISION_ID = 201
    const AL_CENTRAL_DIVISION_ID = 202
    const AL_WESTERN_DIVISION_ID = 200
    const NL_LEAGUE_ID = 104
    const NL_EASTERN_DIVISION_ID = 204
    const NL_CENTRAL_DIVISION_ID = 205
    const NL_WESTERN_DIVISION_ID = 203
    const leagueStandings = await mlbStats.getStandings({
      params: {
        leagueId: NL_LEAGUE_ID,
        // date: currentDate,
      }
    })
    // MLB START DATE NEEDS UPDATED EVERY YEAR

    const mlbStartDate = '2026-03-25'

    const teamStats = await mlbStats.getSchedule({
      params: {
        sportId: 1,
        teamId: id,
        startDate: mlbStartDate,
        // endDate: currentDate
        endDate: '2027-01-01'
      }
    })

    const filterGameByDate = (targetDate: string) => {
      if (teamStats) {
        const games = teamStats.data.dates
        const filteredGame = games.filter((game: any) => game.date === targetDate)

        // return filteredGame[0]
        return filteredGame[0].games[0]
      }
    }

    const gameLiveFeed = await mlbStats.getGameFeed({
      pathParams: {
        gamePk: 824030
      }
    })

    const allTeams = await mlbStats.getTeams({ params: { sportId: 1 } })

    const getScheduleByDate = await mlbStats.getSchedule({
      params: {
        sportId: 1,
        date: '2026-06-03'
      }
    })

    // const someGame = filterGameByDate()

    const teamData = {
      // team,
      teamRoster,
      // leagueStandings,
      teamStats,
      // gameLiveFeed,
      getScheduleByDate,
      allTeams,
      someGame: filterGameByDate('2026-06-05'),
    }

    return reply.status(201).send(teamData)

  } catch (error) {
    console.error('ERROR FETCHING TEAM: ', error)
  }
  // const { id } = request.params;
  // const item = items.find(i => i.id === id);
  // if (!item) return reply.status(404).send({ message: 'Item not found' });
  // return item;
})

// POST (Create) item
// app.post('/items', async (request: FastifyRequest<{ Body: { name: string } }>, reply) => {
//   const { name } = request.body;
//   const newItem = { id: Math.random().toString(36).substr(2, 9), name };
//   items.push(newItem);
//   return reply.status(201).send(newItem);
// });

// PUT (Update) item
// app.put('/items/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: { name: string } }>, reply) => {
//   const { id } = request.params;
//   const { name } = request.body;
//   items = items.map(item => (item.id === id ? { id, name } : item));
//   return { message: `Item ${id} updated` };
// });

// DELETE item
// app.delete('/items/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
//   const { id } = request.params;
//   items = items.filter(item => item.id !== id);
//   return { message: `Item ${id} removed` };
// });

// Start the server

setInterval(async () => {
  try {
    await gameService.refresh()

    sseManager.broadcast(
      gameService.getGames()
    )
  } catch (err) {
    app.log.error(err)
  }
}, 10000)

const start = async () => {
  try {
    await gameService.refresh()

    await app.listen({ port: 3000 })

    console.log(`Server listening on address: http://127.0.0.1:3000`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown on Nodemon restart
const signals = ['SIGINT', 'SIGTERM']
signals.forEach((signal) => {
  process.on(signal, async () => {
    await app.close()
    process.exit(0)
  })
})

start()
