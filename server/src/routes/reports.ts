const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/reports/weekly-summary/:projectId', (req: any, res: any) => {
  try {
    const db = getDb();
    const pid = req.params.projectId;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });

    const zones = db.prepare('SELECT * FROM wbs_zones WHERE project_id = ? ORDER BY code').all(pid);
    const milestones = db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY baseline_date').all(pid);

    let risks = db.prepare('SELECT * FROM risks ORDER BY is_critical DESC').all();
    risks = risks.filter((r: any) => r.project_id == pid && r.status !== 'MITIGATED' && r.status !== 'CLOSED');

    const spiHistory = db.prepare('SELECT * FROM p6_imports WHERE project_id = ? ORDER BY imported_at ASC').all(pid);

    // S-curve
    const baselinePcts = [5, 12, 21, 30, 40, 48, 54, 62, 70, 78, 86, 92, 96, 99, 100];
    const actualPcts = [4, 10, 18, 27, 36, 42, 47, 52, 54];
    const sCurveData = baselinePcts.map((bp, i) => ({
      week: `Нед ${i + 1}`,
      plan: bp,
      actual: actualPcts[i] !== undefined ? actualPcts[i] : null,
    }));

    const zonesArr: any[] = zones;
    const redZones = zonesArr.filter((z: any) => z.status === 'RED').length;
    const amberZones = zonesArr.filter((z: any) => z.status === 'AMBER').length;
    const greenZones = zonesArr.filter((z: any) => z.status === 'GREEN').length;

    res.json({
      project,
      summary: {
        pct_complete: (project as any).pct_complete,
        spi: (project as any).spi,
        variance_days: spiHistory.length > 0 ? (spiHistory[spiHistory.length - 1] as any).variance_days : 0,
        red_zones: redZones,
        amber_zones: amberZones,
        green_zones: greenZones,
        total_headcount: zonesArr.reduce((s: number, z: any) => s + (z.headcount || 0), 0),
        critical_risks: risks.filter((r: any) => r.is_critical).length,
      },
      zones,
      milestones,
      risks,
      s_curve: sCurveData,
      spi_history: spiHistory,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
