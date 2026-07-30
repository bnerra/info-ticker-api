import fastify from 'fastify'
import { FastifyInstance, FastifyReply } from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { GameService } from './services/GameService'
import { SseManager } from './services/SseManager'
import sseRoutes from './routes/sse'

const app: FastifyInstance = fastify({
  logger: true,
})

app.register(fastifyStatic, {
  root: path.resolve('../info-ticker-ui/dist')
})

app.setNotFoundHandler((req, reply) => {
  reply.sendFile('index.html')
})

const gameService = new GameService(app.log)
const sseManager = new SseManager()

app.register(sseRoutes)

app.get('/text', async (request, reply: FastifyReply) => {

  return reply.status(201).send('Welcome Earthling.')
})

app.get('/health', async () => {
  return {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timeStamp: new Date().toISOString()
  }
})

app.get('/batters', async (request, reply: FastifyReply) => {
  const url = `https://statsapi.mlb.com/api/v1/game/823045/boxscore`
  const responses = await fetch(url)
  const response = await responses.json()

  const awayPlayers = Object.values(response.teams.away.players)
  const awayBatters = awayPlayers.filter((player: any) => Object.keys(player.stats.batting).length > 0)

  const battingLeaders = awayBatters.map((batter: any) => ({
    name: batter.person.boxscoreName,
    hits: batter.stats.batting?.hits ?? 0,
    rbi: batter.stats.batting?.rbi ?? 0,
    hr: batter.stats.batting?.homeruns ?? 0,
    summary: batter.stats.batting?.summary ?? '',
  }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
  
  return battingLeaders
})

// GET all items
app.get('/weather', async (request, reply: FastifyReply) => {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=38.78&longitude=-90.59&current=temperature_2m,wind_speed_10m,cloud_cover,weather_code&hourly=precipitation_probability&temperature_unit=fahrenheit&wind_speed_unit=mph&minutely_15=weather_code'
    const responses = await fetch(url);

    const response = await responses.json()

    return reply.status(201).send(response)

  } catch (error) {
    console.error('ERROR FETCHING WEATHER DATA: ', error)
  }
});

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

const PORT = Number(process.env.PORT) || 3000

const start = async () => {
  try {
    await gameService.refresh()
    // await weatherService.refresh()

    await app.listen({
      host: '0.0.0.0',
      port: PORT
    })

    console.log(`Server listening on port: ${PORT}`)
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
