const express = require('express');
const cors = require('cors');
const { initializeDb } = require('./db');

const projectRoutes = require('./routes/project');
const wbsRoutes = require('./routes/wbs');
const dailyReportsRoutes = require('./routes/dailyReports');
const scheduleRoutes = require('./routes/schedule');
const risksRoutes = require('./routes/risks');
const recoveryPlansRoutes = require('./routes/recoveryPlans');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

app.use('/api', projectRoutes);
app.use('/api', wbsRoutes);
app.use('/api', dailyReportsRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', risksRoutes);
app.use('/api', recoveryPlansRoutes);
app.use('/api', reportsRoutes);

app.get('/api/health', (req: any, res: any) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function start() {
  console.log('Инициализация базы данных...');
  await initializeDb();
  console.log('База данных готова.');
  app.listen(PORT, () => {
    console.log(`SiteControl API запущен на http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Ошибка запуска сервера:', err);
  process.exit(1);
});

module.exports = app;
