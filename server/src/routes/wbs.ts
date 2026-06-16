const express = require('express');
const { getDb, saveDb } = require('../db');

const router = express.Router();

router.get('/wbs-zones/:projectId', (req: any, res: any) => {
  try {
    const db = getDb();
    const zones = db.prepare('SELECT * FROM wbs_zones WHERE project_id = ? ORDER BY code').all(req.params.projectId);
    res.json(zones);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/wbs-zones/:id', (req: any, res: any) => {
  try {
    const db = getDb();
    const current = db.prepare('SELECT * FROM wbs_zones WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Зона не найдена' });

    const { pct_complete, headcount, status, forecast_finish, float_days } = req.body;

    db.prepare(`
      UPDATE wbs_zones SET
        pct_complete = ?, headcount = ?, status = ?, forecast_finish = ?, float_days = ?
      WHERE id = ?
    `).run(
      pct_complete ?? current.pct_complete,
      headcount ?? current.headcount,
      status ?? current.status,
      forecast_finish ?? current.forecast_finish,
      float_days ?? current.float_days,
      req.params.id
    );
    saveDb();
    const updated = db.prepare('SELECT * FROM wbs_zones WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
