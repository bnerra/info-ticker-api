import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { GameService } from './services/GameService'
import { SseManager } from './services/SseManager'
import sseRoutes from './routes/sse'

const app: FastifyInstance = fastify({ logger: true })

const gameService = new GameService()
// const weatherService = new WeatherService()
const sseManager = new SseManager()

app.register(sseRoutes)

app.get('/', async (request, reply: FastifyReply) => {

  return reply.status(201).send('Welcome Earthling.')
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

// app.get('/api/live-weather-time', async (request, reply) => {
//   reply.raw.setHeader(
//     'Content-Type',
//     'text/event-stream'
//   )

//   reply.raw.setHeader(
//     'Cache-Control',
//     'no-cache'
//   )

//   reply.raw.setHeader(
//     'Connection',
//     'keep-alive'
//   )

//   reply.raw.setHeader(
//     'Access-Control-Allow-Origin',
//     '*'
//   )

//   reply.raw.flushHeaders()

//   sseManager.addClient(reply.raw)

//   reply.raw.write(
//     `data: ${JSON.stringify(weatherService.getWeatherTime())}\n\n`
//   )

//   return reply
// })

// // DEBUGGING

// app.get('/api/weather-time', async () => {

//   return weatherService.getWeatherTime()
// })


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
    // await weatherService.refresh()

    sseManager.broadcast(
      gameService.getGames()
      // weatherService.getWeatherTime()
    )
  } catch (err) {
    app.log.error(err)
  }
}, 10000)

const start = async () => {
  try {
    await gameService.refresh()
    // await weatherService.refresh()

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
