import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import tripRoutes from './routes/trip.js'
import budgetRoutes from './routes/budget.js'
import { createPool, initDb } from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(
  cors({
    origin: (origin, cb) => {
      const raw = process.env.CORS_ORIGIN
      if (!raw || raw === '*') {
        return cb(null, true)
      }
      const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
      if (!origin || list.includes(origin)) {
        return cb(null, true)
      }
      cb(null, false)
    }
  })
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CROSS Server is running' })
})

async function main() {
  const pool = createPool()
  await initDb(pool)

  app.use('/api/trips', tripRoutes(pool))
  app.use('/api/budget', budgetRoutes(pool))

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
