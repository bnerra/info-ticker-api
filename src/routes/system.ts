import { FastifyPluginAsync } from 'fastify'
import { exec } from 'child_process'

const systemRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/system/shutdown', async () => {
    
    app.log.info('Shutdown requested')

    setTimeout(() => {
      exec('echo "shutdown would happen now"')
    }, 5000)

    return {
      message: 'Shutdown initiated.'
    }
  })
}

export default systemRoutes
