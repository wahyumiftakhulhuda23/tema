export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Belum Absen' | 'Libur' | 'Lainnya';

export interface Department {
  id: string;
  name: string; // e.g. "Rekayasa Perangkat Lunak"
  code?: string; // e.g. "RPL"
}

export interface ClassProgram {
  id: string;
  name: string; // e.g. "XII RPL 1"
  departmentId: string;
  departmentName: string;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  classId: string;
  className: string;
  industryId: string;
  industryName: string;
  phone: string;
  status: 'Aktif' | 'Selesai' | 'Nonaktif';
  avatar?: string;
}

export interface Industry {
  id: string;
  name: string;
  concentration: string;
  address: string;
  owner: string;
  phone: string;
  activeDays: string[]; // e.g. ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
  workHours: string; // e.g. '08:00 - 16:00'
  latitude: number;
  longitude: number;
  radiusMeter: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  industryId: string;
  industryName: string;
  departmentName?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: AttendanceStatus;
  notes?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  accuracyMeter?: number;
  journal?: string;
  verified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type UserRole = 'guest' | 'murid' | 'guru' | 'admin';

export interface AppSettings {
  schoolName: string;
  academicYear: string;
  teacherPasscode: string; // default 12345
  adminPasscode: string; // default P4ssw0rd_*
  minJournalLength: number; // default 200
  notificationReminderTime: string;
}

export interface TeMaState {
  departments: Department[];
  classes: ClassProgram[];
  industries: Industry[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  appSettings: AppSettings;
  lastUpdated?: string;
}

export const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
] as const;

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
