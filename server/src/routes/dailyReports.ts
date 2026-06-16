const express = require('express');
const { getDb, saveDb } = require('../db');

const router = express.Router();

router.get('/daily-reports', (req: any, res: any) => {
  try {
    const db = getDb();
    const { project_id, zone_id, limit = 50 } = req.query;

    const allReports = db.prepare('SELECT * FROM daily_reports ORDER BY date DESC, submitted_at DESC').all();
    const allZones = db.prepare('SELECT * FROM wbs_zones').all();

    let reports = allReports.map((r: any) => {
      const zone = allZones.find((z: any) => z.id == r.wbs_zone_id);
      return { ...r, zone_name: zone?.name, zone_code: zone?.code, project_id: zone?.project_id };
    });

    if (project_id) reports = reports.filter((r: any) => r.project_id == project_id);
    if (zone_id) reports = reports.filter((r: any) => r.wbs_zone_id == zone_id);

    res.json(reports.slice(0, parseInt(limit as string)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/daily-reports', (req: any, res: any) => {
  try {
    const db = getDb();
    const { wbs_zone_id, date, pct_today, headcount, equipment_count, deliveries_status, new_issues, foreman_notes, submitted_by } = req.body;

    if (!wbs_zone_id || !date || !submitted_by) {
      return res.status(400).json({ error: 'Обязательные поля: wbs_zone_id, date, submitted_by' });
    }

    const submitted_at = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO daily_reports (wbs_zone_id, date, pct_today, headcount, equipment_count, deliveries_status, new_issues, foreman_notes, submitted_by, submitted_at, approved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(wbs_zone_id, date, pct_today || 0, headcount || 0, equipment_count || 0,
           deliveries_status || 'NOT_EXPECTED', new_issues || null, foreman_notes || null, submitted_by, submitted_at);

    if (headcount) {
      db.prepare('UPDATE wbs_zones SET headcount = ? WHERE id = ?').run(headcount, wbs_zone_id);
    }
    saveDb();

    const zone = db.prepare('SELECT * FROM wbs_zones WHERE id = ?').get(wbs_zone_id);
    const report = db.prepare('SELECT * FROM daily_reports WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...report, zone_name: zone?.name, zone_code: zone?.code });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/daily-reports/:id/approve', (req: any, res: any) => {
  try {
    const db = getDb();
    db.prepare('UPDATE daily_reports SET approved = 1 WHERE id = ?').run(req.params.id);
    saveDb();
    const report = db.prepare('SELECT * FROM daily_reports WHERE id = ?').get(req.params.id);
    res.json(report);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
