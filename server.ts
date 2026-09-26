import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Storage directory and file
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Empty Data for Production Release
const EMPTY_DATA = {
  departments: [],
  classes: [],
  industries: [],
  students: [],
  attendanceRecords: [],
  appSettings: {
    schoolName: 'SMK Negeri 1 (Nama Sekolah)',
    academicYear: '2025/2026',
    teacherPasscode: '12345',
    adminPasscode: 'P4ssw0rd_*',
    minJournalLength: 200,
    notificationReminderTime: '07:30',
  },
  lastUpdated: new Date().toISOString(),
};

// Optional Template Data for manual load if admin wants
const DEMO_TEMPLATE = {
  departments: [
    { id: 'dep-1', name: 'Rekayasa Perangkat Lunak', code: 'RPL' },
    { id: 'dep-2', name: 'Desain Komunikasi Visual', code: 'DKV' },
    { id: 'dep-3', name: 'Teknik Kendaraan Ringan Otomotif', code: 'TKRO' },
  ],
  classes: [
    { id: 'cls-1', name: 'XII RPL 1', departmentId: 'dep-1', departmentName: 'Rekayasa Perangkat Lunak' },
    { id: 'cls-2', name: 'XII DKV 1', departmentId: 'dep-2', departmentName: 'Desain Komunikasi Visual' },
    { id: 'cls-3', name: 'XII TKRO 1', departmentId: 'dep-3', departmentName: 'Teknik Kendaraan Ringan Otomotif' },
  ],
  industries: [
    {
      id: 'ind-1',
      name: 'PT Rekatama Digital Solusi',
      concentration: 'Pengembangan Web & Aplikasi Mobile',
      address: 'Jl. Soekarno Hatta No. 45 Bandung',
      owner: 'Ir. Hendra Wijaya, M.Kom',
      phone: '0812-3456-7890',
      activeDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      workHours: '08:00 - 16:00',
      latitude: -6.9175,
      longitude: 107.6191,
      radiusMeter: 200,
    },
    {
      id: 'ind-2',
      name: 'Teaching Factory (TeFa) Studio Kreatif',
      concentration: 'Animasi & Desain Grafis Digital',
      address: 'Lab Terpadu TeFa Gedung B Lt. 2',
      owner: 'Ibu Retno Astuti, S.Pd',
      phone: '0813-9876-5432',
      activeDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
      workHours: '07:30 - 15:30',
      latitude: -6.9214,
      longitude: 107.6074,
      radiusMeter: 150,
    }
  ],
  students: [
    {
      id: 'stu-1',
      nis: '22001',
      name: 'Muhammad Fajar Ramadhan',
      departmentId: 'dep-1',
      departmentName: 'Rekayasa Perangkat Lunak',
      classId: 'cls-1',
      className: 'XII RPL 1',
      industryId: 'ind-1',
      industryName: 'PT Rekatama Digital Solusi',
      phone: '0812-1111-2222',
      status: 'Aktif',
    }
  ],
  attendanceRecords: [],
  appSettings: {
    schoolName: 'SMK Negeri 1 (Nama Sekolah)',
    academicYear: '2025/2026',
    teacherPasscode: '12345',
    adminPasscode: 'P4ssw0rd_*',
    minJournalLength: 200,
    notificationReminderTime: '07:30',
  },
  lastUpdated: new Date().toISOString(),
};

// Helper to read database
function readDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY_DATA, null, 2), 'utf-8');
      return EMPTY_DATA;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // Ensure departments array exists
    if (!parsed.departments) parsed.departments = [];
    return parsed;
  } catch (err) {
    console.error('Error reading DB, resetting to empty data:', err);
    return EMPTY_DATA;
  }
}

// Helper to write database
function writeDB(data: any) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TeMa Cloud Sync Server', time: new Date().toISOString() });
});

// Get full state
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

// Submit / update attendance
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

// Direct DELETE student endpoint
app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.students = db.students.filter((s: any) => s.id !== id);
  // Also clean up attendance records for this student
  db.attendanceRecords = db.attendanceRecords.filter((r: any) => r.studentId !== id);
  writeDB(db);
  res.json({ success: true, message: 'Siswa berhasil dihapus', students: db.students });
});

// Direct DELETE industry endpoint
app.delete('/api/industries/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.industries = db.industries.filter((i: any) => i.id !== id);
  writeDB(db);
  res.json({ success: true, message: 'Industri berhasil dihapus', industries: db.industries });
});

// Direct DELETE class endpoint
app.delete('/api/classes/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.classes = db.classes.filter((c: any) => c.id !== id);
  writeDB(db);
  res.json({ success: true, message: 'Kelas berhasil dihapus', classes: db.classes });
});

// Direct DELETE department endpoint
app.delete('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.departments = (db.departments || []).filter((d: any) => d.id !== id);
  writeDB(db);
  res.json({ success: true, message: 'Program Keahlian berhasil dihapus', departments: db.departments });
});

// Clear all data to empty release state
app.post('/api/clear-all', (req, res) => {
  writeDB(EMPTY_DATA);
  res.json({ success: true, message: 'Semua data telah dikosongkan', data: EMPTY_DATA });
});

// Load starter template
app.post('/api/load-template', (req, res) => {
  writeDB(DEMO_TEMPLATE);
  res.json({ success: true, message: 'Template awal berhasil dimuat', data: DEMO_TEMPLATE });
});

// Mount Vite or serve static files
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TeMa Server] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
