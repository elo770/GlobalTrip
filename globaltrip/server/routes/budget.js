import express from 'express'

export default function budgetRoutes(pool) {
  const router = express.Router()

  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, body FROM budget_items ORDER BY updated_at DESC')
      let items = rows.map((r) => ({ ...r.body, id: r.id }))
      const tripId = req.query.tripId
      if (tripId) {
        items = items.filter((item) => item.tripId === tripId)
      }
      res.json({ items })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to list budget items' })
    }
  })

  router.post('/', async (req, res) => {
    try {
      const id = req.body?.id || Date.now().toString()
      const body = { ...req.body, id }
      await pool.query(
        `INSERT INTO budget_items (id, body, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, updated_at = NOW()`,
        [id, JSON.stringify(body)]
      )
      res.json({ success: true, item: body })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to save budget item' })
    }
  })

  router.put('/:id', async (req, res) => {
    const id = req.params.id
    try {
      const merged = { ...req.body, id }
      const { rowCount } = await pool.query(
        `UPDATE budget_items SET body = $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [id, JSON.stringify(merged)]
      )
      if (rowCount === 0) {
        await pool.query(
          `INSERT INTO budget_items (id, body, updated_at) VALUES ($1, $2::jsonb, NOW())`,
          [id, JSON.stringify(merged)]
        )
      }
      res.json({ success: true, item: merged })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to update budget item' })
    }
  })

  router.delete('/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM budget_items WHERE id = $1', [req.params.id])
      res.json({ success: true })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to delete budget item' })
    }
  })

  return router
}
