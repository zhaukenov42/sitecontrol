const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'sitecontrol.db.bin');

let db: any = null;
let SQL: any = null;

// Wrap sql.js database with a synchronous-looking API
class SyncDb {
  private _db: any;

  constructor(db: any) {
    this._db = db;
  }

  exec(sql: string) {
    this._db.run(sql);
    return this;
  }

  prepare(sql: string) {
    const stmt = this._db.prepare(sql);
    return {
      run: (...params: any[]) => {
        stmt.run(params);
        const lastId = this._db.exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0] || 0;
        stmt.free();
        return { lastInsertRowid: lastId };
      },
      get: (...params: any[]) => {
        stmt.bind(params);
        const cols = stmt.getColumnNames();
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params: any[]) => {
        const results: any[] = [];
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
    };
  }

  save() {
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

let syncDb: SyncDb | null = null;

async function initDb() {
  if (syncDb) return syncDb;
  SQL = await initSqlJs();
  let rawDb: any;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
  }
  syncDb = new SyncDb(rawDb);
  initSchema(syncDb);
  seedData(syncDb);
  syncDb.save();
  return syncDb;
}

function initSchema(db: SyncDb) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_company TEXT NOT NULL,
      contractor_company TEXT NOT NULL,
      baseline_start TEXT NOT NULL,
      baseline_finish TEXT NOT NULL,
      actual_start TEXT NOT NULL,
      forecast_finish TEXT NOT NULL,
      pct_complete REAL NOT NULL DEFAULT 0,
      spi REAL NOT NULL DEFAULT 1.0,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS wbs_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      baseline_start TEXT NOT NULL,
      baseline_finish TEXT NOT NULL,
      actual_start TEXT,
      forecast_finish TEXT NOT NULL,
      pct_complete REAL NOT NULL DEFAULT 0,
      float_days INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'GREEN',
      headcount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wbs_zone_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      pct_today REAL NOT NULL DEFAULT 0,
      headcount INTEGER NOT NULL DEFAULT 0,
      equipment_count INTEGER NOT NULL DEFAULT 0,
      deliveries_status TEXT NOT NULL DEFAULT 'NOT_EXPECTED',
      new_issues TEXT,
      foreman_notes TEXT,
      submitted_by TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      baseline_date TEXT NOT NULL,
      forecast_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ON_TRACK'
    );

    CREATE TABLE IF NOT EXISTS risks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      probability TEXT NOT NULL DEFAULT 'MEDIUM',
      impact TEXT NOT NULL DEFAULT 'MEDIUM',
      mitigation TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      is_critical INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS p6_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      spi REAL NOT NULL,
      variance_days INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recovery_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TEXT NOT NULL,
      approved_at TEXT,
      content_json TEXT NOT NULL DEFAULT '{}'
    );
  `);
}

function runInsert(db: SyncDb, sql: string, params: any[]) {
  return db.prepare(sql).run(...params);
}

function seedData(db: SyncDb) {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM projects').get();
  if (existing && (existing as any).cnt > 0) return;

  // Insert project
  const pr = runInsert(db,
    `INSERT INTO projects (name, owner_company, contractor_company, baseline_start, baseline_finish, actual_start, forecast_finish, pct_complete, spi, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Газоперерабатывающий завод — 3-я очередь', 'АО НК КазахГаз', 'ТОО Integra Construction',
     '2024-01-15', '2025-12-31', '2024-01-20', '2026-03-15', 54.2, 0.81, 'ACTIVE']
  );
  const projectId = pr.lastInsertRowid;

  const zones = [
    [projectId, 'WBS-01', 'Фундаментные работы', '2024-01-15', '2024-08-31', '2024-01-20', '2024-09-15', 95, 15, 'GREEN', 12],
    [projectId, 'WBS-02', 'Стальные конструкции', '2024-06-01', '2025-03-31', '2024-06-10', '2025-05-20', 72, -7, 'AMBER', 38],
    [projectId, 'WBS-03', 'Трубопроводы', '2024-08-01', '2025-06-30', '2024-08-15', '2025-09-10', 58, -25, 'RED', 54],
    [projectId, 'WBS-04', 'Электромонтаж', '2024-09-01', '2025-07-31', '2024-09-20', '2025-10-15', 45, -18, 'RED', 42],
    [projectId, 'WBS-05', 'Изоляция', '2025-01-01', '2025-09-30', '2025-01-15', '2025-11-20', 30, -8, 'AMBER', 22],
    [projectId, 'WBS-06', 'Пусконаладка', '2025-06-01', '2025-12-31', null, '2026-03-15', 5, -75, 'RED', 8],
  ];
  const zoneIds: number[] = [];
  for (const z of zones) {
    const r = runInsert(db,
      `INSERT INTO wbs_zones (project_id, code, name, baseline_start, baseline_finish, actual_start, forecast_finish, pct_complete, float_days, status, headcount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      z
    );
    zoneIds.push(r.lastInsertRowid as number);
  }

  // Daily reports
  const today = new Date();
  const zoneData = [
    { id: zoneIds[0], hc: 12, eq: 3, pct: 0.1 },
    { id: zoneIds[1], hc: 38, eq: 8, pct: 0.8 },
    { id: zoneIds[2], hc: 54, eq: 12, pct: 1.2 },
    { id: zoneIds[3], hc: 42, eq: 6, pct: 0.9 },
    { id: zoneIds[4], hc: 22, eq: 4, pct: 0.6 },
    { id: zoneIds[5], hc: 8, eq: 2, pct: 0.1 },
  ];
  const issues = [null, 'Задержка поставки металлоконструкций — 3 дня', 'Нехватка сварщиков 5-го разряда (−4 чел.); утечка на фланцевом соединении DN200', 'Кабельные лотки не завезены; задержка трансформатора ТМ-630', null, 'Ожидание документации на КИПиА'];
  const notes = ['Работы идут в штатном режиме. Готовность к сдаче акта.', 'Монтаж колонных конструкций К-3 — завершён на 80%. Требуется ускорение.', 'Сварочные работы на линии 12" продолжаются. Гидроиспытания запланированы на пятницу.', 'Прокладка кабелей силовых цепей на отм. +6.000. Задержка по поставке.', 'Нанесение тепловой изоляции на участке П-4.', 'Подготовительные работы. Ожидание рабочей документации КИП.'];
  const foremans = ['Прораб Сейткали А.', 'Прораб Берков Р.', 'Прораб Мусаев Д.', 'Прораб Петров И.', 'Прораб Ахметов С.', 'Прораб Нурланов Б.'];

  for (let d = 6; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];
    const submittedAt = new Date(date);
    submittedAt.setHours(17, 30, 0);
    zoneData.forEach((z, i) => {
      runInsert(db,
        `INSERT INTO daily_reports (wbs_zone_id, date, pct_today, headcount, equipment_count, deliveries_status, new_issues, foreman_notes, submitted_by, submitted_at, approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [z.id, dateStr, z.pct + (Math.random() * 0.3), z.hc, z.eq,
         d === 1 ? 'DELAYED' : d === 3 ? 'ON_TIME' : 'NOT_EXPECTED',
         d === 0 ? issues[i] : null, notes[i], foremans[i], submittedAt.toISOString(), d > 0 ? 1 : 0]
      );
    });
  }

  // Milestones
  const ms = [
    [projectId, 'Завершение фундаментных работ', '2024-08-31', '2024-09-15', 'COMPLETE'],
    [projectId, 'Монтаж главного каркаса', '2025-03-31', '2025-05-20', 'AT_RISK'],
    [projectId, 'Готовность трубопроводов к гидроиспытаниям', '2025-06-30', '2025-09-10', 'DELAYED'],
    [projectId, 'Завершение электромонтажа', '2025-07-31', '2025-10-15', 'DELAYED'],
    [projectId, 'Механическая готовность (MC)', '2025-11-30', '2026-02-10', 'AT_RISK'],
    [projectId, 'Предпусковые испытания', '2025-12-15', '2026-02-28', 'AT_RISK'],
    [projectId, 'Ввод в эксплуатацию', '2025-12-31', '2026-03-15', 'DELAYED'],
  ];
  for (const m of ms) runInsert(db, `INSERT INTO milestones (project_id, name, baseline_date, forecast_date, status) VALUES (?, ?, ?, ?, ?)`, m);

  // Risks
  const risks = [
    [projectId, 'Задержка поставки трубной продукции (API 5L Gr.B DN300) — поставщик сообщил о задержке 8 недель', 'HIGH', 'HIGH', 'Параллельный поиск альтернативного поставщика в РФ и КНР. Приоритетное размещение заказа. Ускорение таможенного оформления.', 'Снабженец Ибраев Е.Т.', 'OPEN', 1],
    [projectId, 'Нехватка квалифицированных сварщиков (аттестация НАКС). Текущий дефицит — 8 чел.', 'HIGH', 'HIGH', 'Привлечение субподрядчика ТОО "СварМастер". Организация вахтового метода из Атырау.', 'ПМ Джаксыбеков К.А.', 'IN_PROGRESS', 1],
    [projectId, 'Изменение проектной документации (РД) по секции компрессорного цеха — возможны дополнительные работы', 'MEDIUM', 'HIGH', 'Заморозка РД до 15.07. Оценка объёма изменений силами ПТО. Претензионная работа с проектировщиком.', 'ГИП Сарсенов М.К.', 'OPEN', 1],
    [projectId, 'Неблагоприятные погодные условия (сильные морозы ниже −35°C) зимой 2025–2026', 'MEDIUM', 'MEDIUM', 'Организация тепляков на сварочных постах. Запас материала на 3 недели.', 'ПМ Джаксыбеков К.А.', 'OPEN', 0],
    [projectId, 'Задержка согласования исполнительной документации со стороны заказчика', 'MEDIUM', 'MEDIUM', 'Назначение выделенного представителя АО НК КазахГаз на площадке. Еженедельные совещания по документации.', 'ПТО-инженер Жумабаев А.', 'IN_PROGRESS', 0],
    [projectId, 'Рост стоимости металлопроката (+22% с начала года) — возможный перерасход бюджета', 'LOW', 'HIGH', 'Фиксация цен в рамках долгосрочных контрактов. Оптимизация расхода металла.', 'ПТО-инженер Жумабаев А.', 'OPEN', 0],
  ];
  for (const r of risks) runInsert(db, `INSERT INTO risks (project_id, description, probability, impact, mitigation, owner, status, is_critical) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, r);

  // P6 imports
  const imports = [
    [projectId, 'P6_GPZ3_baseline_2024Q1.xlsx', '2024-04-01T09:00:00.000Z', 0.97, -3],
    [projectId, 'P6_GPZ3_update_2024Q2.xlsx', '2024-07-01T09:00:00.000Z', 0.94, -6],
    [projectId, 'P6_GPZ3_update_2024Q3.xlsx', '2024-10-01T09:00:00.000Z', 0.91, -12],
    [projectId, 'P6_GPZ3_update_2024Q4.xlsx', '2025-01-03T09:00:00.000Z', 0.88, -22],
    [projectId, 'P6_GPZ3_update_2025Q1.xlsx', '2025-04-02T09:00:00.000Z', 0.84, -35],
    [projectId, 'P6_GPZ3_update_2025W22.xlsx', '2025-06-02T09:00:00.000Z', 0.81, -47],
  ];
  for (const imp of imports) runInsert(db, `INSERT INTO p6_imports (project_id, filename, imported_at, spi, variance_days) VALUES (?, ?, ?, ?, ?)`, imp);

  // Recovery plan
  const rpContent = JSON.stringify({
    executiveSummary: 'По состоянию на июнь 2025 года реализация проекта ГПЗ-3 отстаёт от базового графика на 47 календарных дней. Индекс выполнения расписания (SPI) составляет 0,81, что является критическим показателем. Настоящий план восстановления разработан с целью сокращения отставания до 15 дней к ноябрю 2025 года.',
    delayAnalysis: 'Основные причины отставания:\n1. Задержка поставки трубной продукции (потеря ~3 недели на WBS-03)\n2. Дефицит сварщиков НАКС (снижение производительности на 35%)\n3. Изменения в проектной документации компрессорного цеха (перепроектирование +2 недели)\n4. Простои из-за погодных условий в январе–феврале 2025 (−8 дней)',
    recoveryStrategy: '1. Увеличение сменности на трубопроводных работах (WBS-03) до 2 смен по 10 часов\n2. Привлечение дополнительных 12 сварщиков через субподрядчика\n3. Параллельное выполнение работ по изоляции (WBS-05) и электромонтажу (WBS-04)\n4. Внедрение недельного планирования (Look-ahead 3 недели)\n5. Ежедневные оперативные совещания в 07:30',
    revisedMilestones: 'МС (механическая готовность): перенос с 30.11.2025 на 10.02.2026\nВвод в эксплуатацию: перенос с 31.12.2025 на 15.03.2026\nЦелевая дата восстановления до SPI≥0,90: 01.09.2025',
    riskRegisterSummary: 'Критические риски (3): поставка труб, дефицит сварщиков, изменения РД.\nСредние риски (2): погода, согласование ИД.\nРиск перерасхода бюджета под наблюдением.',
    kpis: 'SPI еженедельно: целевой рост +0,02/неделю\nЧисленность на площадке: min 176 чел.\nПроизводительность сварки: 15 стыков/день (WBS-03)\nЕженедельный прирост: 2,5% по трубопроводам',
    signOff: 'Подготовил: ПМ Джаксыбеков К.А.\nПроверил: ГИП Сарсенов М.К.\nСогласование заказчика: АО НК КазахГаз — ожидается',
  });
  runInsert(db, `INSERT INTO recovery_plans (project_id, version, status, created_at, approved_at, content_json) VALUES (?, ?, ?, ?, ?, ?)`,
    [projectId, 1, 'SUBMITTED', '2025-06-05T10:00:00.000Z', null, rpContent]);
}

// Global async db initialization - store promise
let dbPromise: Promise<SyncDb> | null = null;

function getDbPromise(): Promise<SyncDb> {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

// Synchronous wrapper that throws if DB not yet initialized
function getDb(): SyncDb {
  if (!syncDb) throw new Error('DB not initialized yet. Call await initializeDb() first.');
  return syncDb;
}

async function initializeDb(): Promise<SyncDb> {
  return getDbPromise();
}

// Save after write operations
function saveDb() {
  if (syncDb) syncDb.save();
}

module.exports = { getDb, initializeDb, saveDb };
