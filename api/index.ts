// Vercel Serverless Function Handler for /api/*
import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
  body?: any;
  method?: string;
  url?: string;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (data: any) => void;
  send: (data: any) => void;
}

// In-memory store for serverless runtime
let globalState: any = {
  departments: [
    { id: 'dep-1', name: 'REKAYASA PERANGKAT LUNAK', code: 'RPL' },
    { id: 'dep-2', name: 'DESAIN KOMUNIKASI VISUAL', code: 'DKV' },
    { id: 'dep-3', name: 'TEKNIK KENDARAAN RINGAN OTOMOTIF', code: 'TKRO' }
  ],
  classes: [
    { id: 'cls-1', name: 'XII RPL 1', departmentId: 'dep-1', departmentName: 'REKAYASA PERANGKAT LUNAK' },
    { id: 'cls-2', name: 'XII DKV 1', departmentId: 'dep-2', departmentName: 'DESAIN KOMUNIKASI VISUAL' },
    { id: 'cls-3', name: 'XII TKRO 1', departmentId: 'dep-3', departmentName: 'TEKNIK KENDARAAN RINGAN OTOMOTIF' }
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

const EMPTY_DATA = {
  departments: [],
  classes: [],
  industries: [],
  students: [],
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = req.url || '';
  const method = req.method || 'GET';

  // Helper to send JSON
  const sendJson = (statusCode: number, data: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
  };

  // Helper to parse body
  const parseBody = async () => {
    if (req.body) return req.body;
    return new Promise<any>((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
    });
  };

  try {
    // 1. GET /api/health
    if (url.includes('/api/health')) {
      return sendJson(200, { status: 'ok', service: 'TeMa Cloud API', time: new Date().toISOString() });
    }

    // 2. GET /api/state
    if (url.includes('/api/state') && method === 'GET') {
      return sendJson(200, globalState);
    }

    // 3. POST /api/sync
    if (url.includes('/api/sync') && method === 'POST') {
      const incoming = await parseBody();
      globalState = {
        departments: incoming.departments !== undefined ? incoming.departments : globalState.departments,
        industries: incoming.industries !== undefined ? incoming.industries : globalState.industries,
        classes: incoming.classes !== undefined ? incoming.classes : globalState.classes,
        students: incoming.students !== undefined ? incoming.students : globalState.students,
        attendanceRecords: incoming.attendanceRecords !== undefined ? incoming.attendanceRecords : globalState.attendanceRecords,
        appSettings: incoming.appSettings || globalState.appSettings,
        lastUpdated: new Date().toISOString(),
      };
      return sendJson(200, { success: true, data: globalState });
    }

    // 4. POST /api/attendance
    if (url.includes('/api/attendance') && method === 'POST') {
      const newRecord = await parseBody();
      if (!newRecord.studentId || !newRecord.date || !newRecord.status) {
        return sendJson(400, { error: 'Data absensi tidak lengkap' });
      }

      const existingIndex = globalState.attendanceRecords.findIndex(
        (r: any) => r.studentId === newRecord.studentId && r.date === newRecord.date
      );

      if (existingIndex >= 0) {
        globalState.attendanceRecords[existingIndex] = {
          ...globalState.attendanceRecords[existingIndex],
          ...newRecord,
          updatedAt: new Date().toISOString(),
        };
      } else {
        globalState.attendanceRecords.unshift({
          id: newRecord.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date().toISOString(),
          ...newRecord,
        });
      }

      globalState.lastUpdated = new Date().toISOString();
      return sendJson(200, { success: true, record: newRecord, records: globalState.attendanceRecords });
    }

    // 4b. DELETE /api/attendance
    if (url.includes('/api/attendance') && method === 'DELETE') {
      const parts = url.split('/');
      const id = parts[parts.length - 1];
      globalState.attendanceRecords = (globalState.attendanceRecords || []).filter((r: any) => r.id !== id);
      globalState.lastUpdated = new Date().toISOString();
      return sendJson(200, { success: true, message: 'Presensi/Jurnal dihapus', records: globalState.attendanceRecords });
    }

    // 5. POST /api/clear-all
    if (url.includes('/api/clear-all') && method === 'POST') {
      globalState = { ...EMPTY_DATA, lastUpdated: new Date().toISOString() };
      return sendJson(200, { success: true, message: 'Semua data telah dikosongkan', data: globalState });
    }

    // Default fallback
    return sendJson(200, globalState);
  } catch (err: any) {
    return sendJson(500, { error: err.message || 'Internal Server Error' });
  }
}
