// Vercel Serverless Function Handler for /api/*
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

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

// 100% CLEAN EMPTY INITIAL DATA FOR PRODUCTION RELEASE
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

// Storage path in Vercel / serverless runtime
const DATA_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'tema_database.json');

// In-memory fallback cache
let cachedState: any = null;

function readDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (!parsed.departments) parsed.departments = [];
      if (!parsed.classes) parsed.classes = [];
      if (!parsed.industries) parsed.industries = [];
      if (!parsed.students) parsed.students = [];
      if (!parsed.attendanceRecords) parsed.attendanceRecords = [];
      cachedState = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('Could not read file database, using cache/clean:', err);
  }

  if (cachedState) return cachedState;
  cachedState = JSON.parse(JSON.stringify(EMPTY_DATA));
  return cachedState;
}

function writeDatabase(data: any) {
  try {
    data.lastUpdated = new Date().toISOString();
    cachedState = data;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('Could not write to file database, cached in-memory:', err);
    cachedState = data;
    return true;
  }
}

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
      const db = readDatabase();
      return sendJson(200, db);
    }

    // 3. POST /api/sync
    if (url.includes('/api/sync') && method === 'POST') {
      const incoming = await parseBody();
      const current = readDatabase();

      const mergedState = {
        departments: incoming.departments !== undefined ? incoming.departments : current.departments,
        industries: incoming.industries !== undefined ? incoming.industries : current.industries,
        classes: incoming.classes !== undefined ? incoming.classes : current.classes,
        students: incoming.students !== undefined ? incoming.students : current.students,
        attendanceRecords: incoming.attendanceRecords !== undefined ? incoming.attendanceRecords : current.attendanceRecords,
        appSettings: incoming.appSettings || current.appSettings,
        lastUpdated: new Date().toISOString(),
      };

      writeDatabase(mergedState);
      return sendJson(200, { success: true, data: mergedState });
    }

    // 4. POST /api/attendance
    if (url.includes('/api/attendance') && method === 'POST') {
      const newRecord = await parseBody();
      if (!newRecord.studentId || !newRecord.date || !newRecord.status) {
        return sendJson(400, { error: 'Data absensi tidak lengkap' });
      }

      const db = readDatabase();
      const existingIndex = (db.attendanceRecords || []).findIndex(
        (r: any) => r.studentId === newRecord.studentId && r.date === newRecord.date
      );

      if (existingIndex >= 0) {
        db.attendanceRecords[existingIndex] = {
          ...db.attendanceRecords[existingIndex],
          ...newRecord,
          updatedAt: new Date().toISOString(),
        };
      } else {
        if (!db.attendanceRecords) db.attendanceRecords = [];
        db.attendanceRecords.unshift({
          id: newRecord.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date().toISOString(),
          ...newRecord,
        });
      }

      writeDatabase(db);
      return sendJson(200, { success: true, record: newRecord, records: db.attendanceRecords });
    }

    // 4b. DELETE /api/attendance
    if (url.includes('/api/attendance') && method === 'DELETE') {
      const parts = url.split('/');
      const id = parts[parts.length - 1];
      const db = readDatabase();
      db.attendanceRecords = (db.attendanceRecords || []).filter((r: any) => r.id !== id);
      writeDatabase(db);
      return sendJson(200, { success: true, message: 'Presensi/Jurnal dihapus', records: db.attendanceRecords });
    }

    // 5. POST /api/clear-all
    if (url.includes('/api/clear-all') && method === 'POST') {
      const cleanData = JSON.parse(JSON.stringify(EMPTY_DATA));
      cleanData.lastUpdated = new Date().toISOString();
      writeDatabase(cleanData);
      return sendJson(200, { success: true, message: 'Semua data telah dikosongkan', data: cleanData });
    }

    // Default fallback: return current database state
    const currentDB = readDatabase();
    return sendJson(200, currentDB);
  } catch (err: any) {
    return sendJson(500, { error: err.message || 'Internal Server Error' });
  }
}
