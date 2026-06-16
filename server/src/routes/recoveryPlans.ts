const express = require('express');
const { getDb, saveDb } = require('../db');

const router = express.Router();

router.get('/recovery-plans', (req: any, res: any) => {
  try {
    const db = getDb();
    const { project_id } = req.query;
    let plans = db.prepare('SELECT * FROM recovery_plans ORDER BY version DESC').all();
    if (project_id) plans = plans.filter((p: any) => p.project_id == project_id);
    res.json(plans.map((p: any) => {
      try { return { ...p, content_json: JSON.parse(p.content_json) }; }
      catch { return { ...p, content_json: {} }; }
    }));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/recovery-plans', (req: any, res: any) => {
  try {
    const db = getDb();
    const { project_id, content_json } = req.body;
    if (!project_id) return res.status(400).json({ error: 'project_id обязателен' });

    const existing = db.prepare('SELECT MAX(version) as v FROM recovery_plans WHERE project_id = ?').get(project_id);
    const version = ((existing as any)?.v || 0) + 1;

    const result = db.prepare(`
      INSERT INTO recovery_plans (project_id, version, status, created_at, content_json)
      VALUES (?, ?, 'DRAFT', ?, ?)
    `).run(project_id, version, new Date().toISOString(), JSON.stringify(content_json || {}));
    saveDb();
    const plan = db.prepare('SELECT * FROM recovery_plans WHERE id = ?').get(result.lastInsertRowid);
    try { return res.status(201).json({ ...plan, content_json: JSON.parse((plan as any).content_json) }); }
    catch { return res.status(201).json({ ...plan, content_json: {} }); }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/recovery-plans/:id', (req: any, res: any) => {
  try {
    const db = getDb();
    const current = db.prepare('SELECT * FROM recovery_plans WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'План не найден' });
    const { status, content_json } = req.body;
    const approved_at = status === 'APPROVED' ? new Date().toISOString() : (current as any).approved_at;
    db.prepare(`
      UPDATE recovery_plans SET status = ?, content_json = ?, approved_at = ? WHERE id = ?
    `).run(
      status ?? (current as any).status,
      content_json ? JSON.stringify(content_json) : (current as any).content_json,
      approved_at,
      req.params.id
    );
    saveDb();
    const plan = db.prepare('SELECT * FROM recovery_plans WHERE id = ?').get(req.params.id);
    try { return res.json({ ...plan, content_json: JSON.parse((plan as any).content_json) }); }
    catch { return res.json({ ...plan, content_json: {} }); }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
