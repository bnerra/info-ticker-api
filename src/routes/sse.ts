import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

type SSEMessage = {
  id: string
  data: unknown
}

export default async function sseRoutes(fastify: FastifyInstance) {
  fastify.get('/api/stream', (request: FastifyRequest, reply: FastifyReply) => {
    // Set mandatory headers for SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    // Take manual control of the socket stream
    reply.hijack()

    // Utility to format and push messages to client
    const sendEvent = (message: SSEMessage) => {
      reply.raw.write(`id: ${message.id}\n`)
      reply.raw.write(`data: ${JSON.stringify(message.data)}\n\n`)
    }

    // 15-second heartbeat to keep connection alive through proxies
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n')
    }, 15000)

    // Clean up memory leaks when client disconnects
    request.raw.on('close', () => {
      clearInterval(heartbeat)
    })
  })
}
