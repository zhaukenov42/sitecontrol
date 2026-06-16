const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/projects/:id', (req: any, res: any) => {
  try {
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    project.spi_status = project.spi >= 0.95 ? 'GREEN' : project.spi >= 0.85 ? 'AMBER' : 'RED';
    res.json(project);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/projects/:id/dashboard', (req: any, res: any) => {
  try {
    const db = getDb();
    const pid = req.params.id;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });

    const zones = db.prepare('SELECT * FROM wbs_zones WHERE project_id = ?').all(pid);
    const milestones = db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY baseline_date').all(pid);

    const openRisksRow = db.prepare("SELECT COUNT(*) as cnt FROM risks WHERE project_id = ? AND status NOT IN ('MITIGATED','CLOSED')").get(pid);
    const criticalRisksRow = db.prepare("SELECT COUNT(*) as cnt FROM risks WHERE project_id = ? AND is_critical = 1 AND status NOT IN ('MITIGATED','CLOSED')").get(pid);

    const openRisksCount = openRisksRow ? openRisksRow.cnt : 0;
    const criticalRisksCount = criticalRisksRow ? criticalRisksRow.cnt : 0;

    const today = new Date().toISOString().split('T')[0];

    // Get all reports joined with zone
    const allReports = db.prepare('SELECT * FROM daily_reports').all();
    const allZones: any[] = zones;

    const todayReports = allReports.filter((r: any) => {
      const zone = allZones.find((z: any) => z.id == r.wbs_zone_id);
      return zone && zone.project_id == pid && r.date === today;
    });

    const todayHeadcount = todayReports.reduce((s: number, r: any) => s + (r.headcount || 0), 0);
    const todayIncrement = todayReports.length > 0
      ? (todayReports.reduce((s: number, r: any) => s + (r.pct_today || 0), 0) / todayReports.length)
      : 0;
    const openBlockers = todayReports.filter((r: any) => r.new_issues && String(r.new_issues).trim()).length;

    const spiTrend = db.prepare('SELECT imported_at, spi, variance_days FROM p6_imports WHERE project_id = ? ORDER BY imported_at ASC LIMIT 8').all(pid);

    // Recent reports
    const recentReports = allReports
      .filter((r: any) => {
        const zone = allZones.find((z: any) => z.id == r.wbs_zone_id);
        return zone && zone.project_id == pid;
      })
      .sort((a: any, b: any) => (b.date > a.date ? 1 : -1))
      .slice(0, 20)
      .map((r: any) => {
        const zone = allZones.find((z: any) => z.id == r.wbs_zone_id);
        return { ...r, zone_name: zone?.name, zone_code: zone?.code };
      });

    res.json({
      project,
      metrics: {
        pct_complete: project.pct_complete,
        spi: project.spi,
        today_increment: parseFloat(todayIncrement.toFixed(2)),
        headcount_onsite: todayHeadcount || allZones.reduce((s: number, z: any) => s + (z.headcount || 0), 0),
        open_blockers: openBlockers,
        open_risks: openRisksCount,
        critical_risks: criticalRisksCount,
      },
      zones,
      milestones,
      spi_trend: spiTrend,
      recent_reports: recentReports,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
