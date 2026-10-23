import 'dotenv/config'

import app from './app.js'
import { prisma } from './lib/prisma.js'

const port = Number(process.env.PORT ?? 3000)

const server = app.listen(port, () => {
  console.log(
    `Boutique API running at http://localhost:${port}`,
  )
})

async function shutdown() {
  console.log('Shutting down boutique API...')

  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)