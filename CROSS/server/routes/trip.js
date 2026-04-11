import express from 'express'

export default function tripRoutes(pool) {
  const router = express.Router()

  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, body FROM trips ORDER BY updated_at DESC'
      )
      const trips = rows.map((r) => ({
        ...r.body,
        id: r.id
      }))
      res.json({ trips, schedules: [] })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to list trips' })
    }
  })

  router.post('/', async (req, res) => {
    try {
      const id = req.body?.id || Date.now().toString()
      const body = { ...req.body, id }
      await pool.query(
        `INSERT INTO trips (id, body, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, updated_at = NOW()`,
        [id, JSON.stringify(body)]
      )
      res.json({ success: true, trip: body })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to save trip' })
    }
  })

  router.put('/:id', async (req, res) => {
    const id = req.params.id
    try {
      const merged = { ...req.body, id }
      const { rowCount } = await pool.query(
        `UPDATE trips SET body = $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [id, JSON.stringify(merged)]
      )
      if (rowCount === 0) {
        await pool.query(
          `INSERT INTO trips (id, body, updated_at) VALUES ($1, $2::jsonb, NOW())`,
          [id, JSON.stringify(merged)]
        )
      }
      res.json({ success: true, trip: merged })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to update trip' })
    }
  })

  router.delete('/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM trips WHERE id = $1', [req.params.id])
      res.json({ success: true })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to delete trip' })
    }
  })

  router.post('/:id/schedule', async (req, res) => {
    res.status(501).json({ success: false, message: 'Schedule is stored inside trip body on client' })
  })

  router.get('/:id/schedule', async (req, res) => {
    res.json({ schedules: [] })
  })

  return router
}
