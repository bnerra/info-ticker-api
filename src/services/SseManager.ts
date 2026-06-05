import { ServerResponse } from 'http'

export class SseManager {
  private clients = new Set<ServerResponse>()

  addClient(response: ServerResponse) {
    this.clients.add(response)

    response.on('close', () => {
      this.clients.delete(response)
    })
  }

  broadcast(data: unknown) {
    const payload = `data: ${JSON.stringify(data)}\n\n`

    for (const client of this.clients) {
      client.write(payload)
    }
  }

  getClientCount() {

    return this.clients.size
  }
}
