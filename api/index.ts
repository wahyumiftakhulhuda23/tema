import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Storage directory and file
const DATA_DIR = process.env.VERCEL
  ? path.resolve('/tmp', 'tema-data')
  : path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create DATA_DIR:', e);
}

// In-memory cache for serverless resiliency
let memoryCache: any = null;

const EMPTY_DATA = {
  departments: [],
  classes: [],
  industries: [],
  students: [],
  attendanceRecords: [],
  appSettings: {
    schoolName: 'SMK Negeri 1',
    academicYear: '2025/2026',
    teacherPasscode: '12345',
    adminPasscode: 'P4ssw0rd_*',
    minJournalLength: 200,
    notificationReminderTime: '07:30',
  },
  lastUpdated: new Date().toISOString(),
};

const DEMO_TEMPLATE = {
  departments: [
    { id: 'dep-1', name: 'REKAYASA PERANGKAT LUNAK', code: 'RPL' },
    { id: 'dep-2', name: 'DESAIN KOMUNIKASI VISUAL', code: 'DKV' },
    { id: 'dep-3', name: 'TEKNIK KENDARAAN RINGAN OTOMOTIF', code: 'TKRO' },
  ],
  classes: [
    { id: 'cls-1', name: 'XII RPL 1', departmentId: 'dep-1', departmentName: 'REKAYASA PERANGKAT LUNAK' },
    { id: 'cls-2', name: 'XII DKV 1', departmentId: 'dep-2', departmentName: 'DESAIN KOMUNIKASI VISUAL' },
    { id: 'cls-3', name: 'XII TKRO 1', departmentId: 'dep-3', departmentName: 'TEKNIK KENDARAAN RINGAN OTOMOTIF' },
  ],
  industries: [
    {
      id: 'ind-1',
      name: 'PT REKATAMA DIGITAL SOLUSI',
      concentration: 'PENGEMBANGAN WEB & APLIKASI MOBILE',
      address: 'JL. SOEKARNO HATTA NO. 45 BANDUNG',
      owner: 'BAPAK HENDRA WIJAYA',
      phone: '0812-3456-7890',
      activeDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      workHours: '08:00 - 16:00',
      latitude: -6.9175,
      longitude: 107.6191,
      radiusMeter: 250,
    },
    {
      id: 'ind-2',
      name: 'TEACHING FACTORY (TEFA) STUDIO KREATIF',
      concentration: 'ANIMASI & DESAIN GRAFIS DIGITAL',
      address: 'LAB TERPADU TEFA GEDUNG B LT. 2',
      owner: 'IBU RETNO ASTUTI',
      phone: '0813-9876-5432',
      activeDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
      workHours: '07:30 - 15:30',
      latitude: -6.9214,
      longitude: 107.6074,
      radiusMeter: 200,
    }
  ],
  students: [
    {
      id: 'stu-1',
      nis: '',
      name: 'MUHAMMAD FAJAR RAMADHAN',
      departmentId: 'dep-1',
      departmentName: 'REKAYASA PERANGKAT LUNAK',
      classId: 'cls-1',
      className: 'XII RPL 1',
      industryId: 'ind-1',
      industryName: 'PT REKATAMA DIGITAL SOLUSI',
      phone: '',
      status: 'Aktif',
    }
  ],
  attendanceRecords: [],
  appSettings: {
    schoolName: 'SMK NEGERI 1',
    academicYear: '2025/2026',
    teacherPasscode: '12345',
    adminPasscode: 'P4ssw0rd_*',
    minJournalLength: 200,
    notificationReminderTime: '07:30',
  },
  lastUpdated: new Date().toISOString(),
};

function readDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (!parsed.departments) parsed.departments = [];
      memoryCache = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('Error reading file DB, using memory cache:', err);
  }

  if (memoryCache) {
    return memoryCache;
  }

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY_DATA, null, 2), 'utf-8');
  } catch (e) {
    // Ignore in read-only environment
  }
  memoryCache = EMPTY_DATA;
  return EMPTY_DATA;
}

function writeDB(data: any) {
  try {
    data.lastUpdated = new Date().toISOString();
    memoryCache = data;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('Error writing DB to disk, preserved in memory:', err);
    memoryCache = data;
    return true;
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TeMa Cloud Sync Server', time: new Date().toISOString() });
});

// Get state
app.get('/api/state', (req, res) => {
  const db = readDB();
  res.json(db);
});

// Full state sync from client
app.post('/api/sync', (req, res) => {
  const incoming = req.body;
  const current = readDB();

  const merged = {
    departments: incoming.departments !== undefined ? incoming.departments : (current.departments || []),
    industries: incoming.industries !== undefined ? incoming.industries : current.industries,
    classes: incoming.classes !== undefined ? incoming.classes : current.classes,
    students: incoming.students !== undefined ? incoming.students : current.students,
    attendanceRecords: incoming.attendanceRecords !== undefined ? incoming.attendanceRecords : current.attendanceRecords,
    appSettings: incoming.appSettings || current.appSettings,
    lastUpdated: new Date().toISOString(),
  };

  writeDB(merged);
  res.json({ success: true, data: merged });
});

// Attendance submission
app.post('/api/attendance', (req, res) => {
  const newRecord = req.body;
  if (!newRecord.studentId || !newRecord.date || !newRecord.status) {
    return res.status(400).json({ error: 'Data absensi tidak lengkap' });
  }

  const db = readDB();
  const existingIndex = db.attendanceRecords.findIndex(
    (r: any) => r.studentId === newRecord.studentId && r.date === newRecord.date
  );

  if (existingIndex >= 0) {
    db.attendanceRecords[existingIndex] = {
      ...db.attendanceRecords[existingIndex],
      ...newRecord,
      updatedAt: new Date().toISOString(),
    };
  } else {
    db.attendanceRecords.unshift({
      id: newRecord.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...newRecord,
    });
  }

  writeDB(db);
  res.json({ success: true, record: newRecord, records: db.attendanceRecords });
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.students = (db.students || []).filter((s: any) => s.id !== id);
  db.attendanceRecords = (db.attendanceRecords || []).filter((r: any) => r.studentId !== id);
  writeDB(db);
  res.json({ success: true, message: 'Siswa berhasil dihapus', students: db.students });
});

// Delete industry
app.delete('/api/industries/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.industries = (db.industries || []).filter((i: any) => i.id !== id);
  writeDB(db);
  res.json({ success: true, message: 'Industri berhasil dihapus', industries: db.industries });
});

// Delete class
app.delete('/api/classes/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.classes = (db.classes || []).filter((c: any) => c.id !== id);
  writeDB(db);
  res.json({ success: true, message: 'Kelas berhasil dihapus', classes: db.classes });
});

// Delete department
app.delete('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.departments = (db.departments || []).filter((d: any) => d.id !== id);
  writeDB(db);
  res.json({ success: true, message: 'Program Keahlian berhasil dihapus', departments: db.departments });
});

// Reset database
app.post('/api/clear-all', (req, res) => {
  writeDB(EMPTY_DATA);
  res.json({ success: true, message: 'Semua data telah dikosongkan', data: EMPTY_DATA });
});

// Load template
app.post('/api/load-template', (req, res) => {
  writeDB(DEMO_TEMPLATE);
  res.json({ success: true, message: 'Template awal berhasil dimuat', data: DEMO_TEMPLATE });
});

export default app;
