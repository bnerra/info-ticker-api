import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
const MLBStatsAPI = require('mlb-stats-api')

const mlbStats = new MLBStatsAPI()

const app: FastifyInstance = fastify({ logger: true });

interface Item {
  id: string;
  name: string;
}

let items: Item[] = [
  { id: '1', name: 'Item One' }
];

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
        endDate: currentDate
      }
    })

    const gameLiveFeed = await mlbStats.getGameFeed({
      pathParams: {
        gamePk: 824030
      }
    })

    const allTeams = await mlbStats.getTeams({ params: { sportId: 1 } })

    const teamData = {
      // team,
      // teamRoster,
      // leagueStandings,
      // teamStats,
      gameLiveFeed,
      allTeams,
    }

    return reply.status(201).send(teamData)

  } catch (error) {
    console.error('ERROR FETCHING TEAM: ', error)
  }
  // const { id } = request.params;
  // const item = items.find(i => i.id === id);
  // if (!item) return reply.status(404).send({ message: 'Item not found' });
  // return item;
});

// POST (Create) item
app.post('/items', async (request: FastifyRequest<{ Body: { name: string } }>, reply) => {
  const { name } = request.body;
  const newItem = { id: Math.random().toString(36).substr(2, 9), name };
  items.push(newItem);
  return reply.status(201).send(newItem);
});

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
const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log(`Server listening on address: http://127.0.0.1:3000`)
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
