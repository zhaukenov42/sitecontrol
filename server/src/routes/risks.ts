const express = require('express');
const { getDb, saveDb } = require('../db');

const router = express.Router();

router.get('/risks', (req: any, res: any) => {
  try {
    const db = getDb();
    const { project_id, status } = req.query;
    let risks = db.prepare('SELECT * FROM risks ORDER BY is_critical DESC, id ASC').all();
    if (project_id) risks = risks.filter((r: any) => r.project_id == project_id);
    if (status) risks = risks.filter((r: any) => r.status === status);
    res.json(risks);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/risks', (req: any, res: any) => {
  try {
    const db = getDb();
    const { project_id, description, probability, impact, mitigation, owner, status, is_critical } = req.body;
    if (!project_id || !description || !mitigation || !owner) {
      return res.status(400).json({ error: 'Обязательные поля: project_id, description, mitigation, owner' });
    }
    const result = db.prepare(`
      INSERT INTO risks (project_id, description, probability, impact, mitigation, owner, status, is_critical)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(project_id, description, probability || 'MEDIUM', impact || 'MEDIUM', mitigation, owner, status || 'OPEN', is_critical ? 1 : 0);
    saveDb();
    const risk = db.prepare('SELECT * FROM risks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(risk);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/risks/:id', (req: any, res: any) => {
  try {
    const db = getDb();
    const current = db.prepare('SELECT * FROM risks WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Риск не найден' });
    const { description, probability, impact, mitigation, owner, status, is_critical } = req.body;
    db.prepare(`
      UPDATE risks SET description = ?, probability = ?, impact = ?, mitigation = ?, owner = ?, status = ?, is_critical = ? WHERE id = ?
    `).run(
      description ?? current.description,
      probability ?? current.probability,
      impact ?? current.impact,
      mitigation ?? current.mitigation,
      owner ?? current.owner,
      status ?? current.status,
      is_critical !== undefined ? (is_critical ? 1 : 0) : current.is_critical,
      req.params.id
    );
    saveDb();
    res.json(db.prepare('SELECT * FROM risks WHERE id = ?').get(req.params.id));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/risks/:id', (req: any, res: any) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM risks WHERE id = ?').run(req.params.id);
    saveDb();
    res.json({ deleted: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
