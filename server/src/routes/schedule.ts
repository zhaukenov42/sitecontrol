const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, saveDb } = require('../db');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req: any, file: any, cb: any) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

function mockParseP6(filename: string, currentSpi: number) {
  const delta = (Math.random() * 0.04) - 0.01;
  const newSpi = Math.max(0.6, Math.min(1.05, currentSpi + delta));
  const varianceDays = Math.round((1 - newSpi) * 200);
  return { spi: parseFloat(newSpi.toFixed(3)), variance_days: varianceDays };
}

router.post('/schedule/import', upload.single('file'), (req: any, res: any) => {
  try {
    const db = getDb();
    const { project_id } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    if (!project_id) return res.status(400).json({ error: 'project_id обязателен' });

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });

    const parsed = mockParseP6(req.file.originalname, (project as any).spi);

    const result = db.prepare(`
      INSERT INTO p6_imports (project_id, filename, imported_at, spi, variance_days)
      VALUES (?, ?, ?, ?, ?)
    `).run(project_id, req.file.originalname, new Date().toISOString(), parsed.spi, parsed.variance_days);

    db.prepare('UPDATE projects SET spi = ? WHERE id = ?').run(parsed.spi, project_id);
    saveDb();

    const importRecord = db.prepare('SELECT * FROM p6_imports WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ import: importRecord, parsed });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/p6-imports/:projectId', (req: any, res: any) => {
  try {
    const db = getDb();
    const imports = db.prepare('SELECT * FROM p6_imports WHERE project_id = ? ORDER BY imported_at DESC').all(req.params.projectId);
    res.json(imports);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
