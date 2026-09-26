import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  TeMaState,
  Department,
  ClassProgram,
  Industry,
  Student,
  AttendanceRecord,
  AppSettings,
  AttendanceStatus,
  UserRole,
  INDONESIAN_DAYS
} from '../types';
import { getTodayDateString, calculateDistanceMeters } from '../utils/helpers';
import { playSuccess, playDelete, playTap, playWarning } from '../utils/sound';

const LOCAL_STORAGE_KEY = 'tema_app_state_v3';
const ACTIVE_ROLE_KEY = 'tema_active_role_v3';
const ACTIVE_STUDENT_KEY = 'tema_active_student_id_v3';

interface TodayStudentStatus {
  status: AttendanceStatus;
  record: AttendanceRecord | null;
  isActiveDay: boolean;
  industry: Industry | null;
  dayName: string;
  reason?: string;
}

export interface GeolocationResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationName?: string;
  distanceToIndustry?: number;
  isWithinRadius?: boolean;
  error?: string;
}

interface TeMaContextType {
  state: TeMaState;
  loading: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime: Date | null;
  
  // Role Portal
  activeRole: UserRole;
  loginAsMurid: () => void;
  loginAsGuru: (password: string) => boolean;
  loginAsAdmin: (password: string) => boolean;
  logoutRole: () => void;

  // Active Student for Murid mode
  activeStudent: Student | null;
  setActiveStudentId: (id: string | null) => void;

  getStudentTodayStatus: (studentId: string, targetDate?: string) => TodayStudentStatus;
  submitAttendance: (data: {
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
    journal?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    accuracyMeter?: number;
    verified?: boolean;
    date?: string;
    time?: string;
  }) => Promise<{ success: boolean; message: string }>;

  // CRUD for Guru
  saveDepartment: (dept: Partial<Department> & { name: string; code?: string }) => Promise<void>;
  deleteDepartment: (deptId: string) => Promise<void>;
  saveClass: (classData: Partial<ClassProgram> & { name: string; departmentId: string }) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  saveIndustry: (industry: Partial<Industry> & { name: string; concentration: string }) => Promise<void>;
  deleteIndustry: (industryId: string) => Promise<void>;
  saveStudent: (student: Partial<Student> & { name: string; industryId: string; className?: string; classId?: string; departmentName?: string; departmentId?: string }) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  deleteAttendanceRecord: (recordId: string, studentId?: string, date?: string) => Promise<void>;

  // System Settings for Administrator
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  clearAllData: () => Promise<void>;
  loadStarterTemplate: () => Promise<void>;

  // Accurate Geolocation
  fetchCurrentLocation: (industry?: Industry | null) => Promise<GeolocationResult>;

  // Notifications
  requestNotificationPermission: () => Promise<boolean>;
  sendLocalNotification: (title: string, body: string) => void;

  // Navigation Subtabs
  activeStudentTab: 'home' | 'history';
  setActiveStudentTab: (tab: 'home' | 'history') => void;
  activeGuruTab: 'recap' | 'students' | 'industries' | 'classes';
  setActiveGuruTab: (tab: 'recap' | 'students' | 'industries' | 'classes') => void;
  triggerCloudSync: () => Promise<void>;
}

const TeMaContext = createContext<TeMaContextType | undefined>(undefined);

export const TeMaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TeMaState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.departments) parsed.departments = [];
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read localStorage', e);
    }
    return {
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
    };
  });

  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Active Role ('guest' | 'murid' | 'guru' | 'admin')
  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem(ACTIVE_ROLE_KEY) as UserRole) || 'guest';
  });

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
  };

  // Active student in Murid mode
  const [activeStudentId, setActiveStudentIdState] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_STUDENT_KEY) || null;
  });

  const setActiveStudentId = (id: string | null) => {
    setActiveStudentIdState(id);
    if (id) {
      localStorage.setItem(ACTIVE_STUDENT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_STUDENT_KEY);
    }
  };

  const activeStudent = state.students.find(s => s.id === activeStudentId) || null;

  // Subtabs
  const [activeStudentTab, setActiveStudentTab] = useState<'home' | 'history'>('home');
  const [activeGuruTab, setActiveGuruTab] = useState<'recap' | 'students' | 'industries' | 'classes'>('recap');

  // Authoritative Cloud Fetch: immediately sets state with server data
  const fetchCloudState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const cloudData: TeMaState = await res.json();
        // Server data is authoritative
        setState(cloudData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudData));
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } else {
        setSyncStatus('offline');
      }
    } catch (err) {
      console.warn('Sync error:', err);
      setSyncStatus('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  // Post state directly to server
  const pushStateToCloud = async (newState: TeMaState) => {
    setState(newState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setState(result.data);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result.data));
        }
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('Sync push error:', err);
      setSyncStatus('offline');
    }
  };

  // Auto-sync polling every 1.5 seconds + on window focus
  useEffect(() => {
    fetchCloudState();
    const interval = setInterval(fetchCloudState, 1500);

    const handleFocus = () => fetchCloudState();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchCloudState();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchCloudState]);

  // Role Login Handlers
  const loginAsMurid = () => {
    setActiveStudentId(null);
    setActiveRole('murid');
    setActiveStudentTab('home');
    playTap();
  };

  const loginAsGuru = (password: string): boolean => {
    const validPassword = state.appSettings.teacherPasscode || '12345';
    if (password.trim() === validPassword) {
      setActiveRole('guru');
      playSuccess();
      return true;
    }
    playWarning();
    return false;
  };

  const loginAsAdmin = (password: string): boolean => {
    const validPassword = state.appSettings.adminPasscode || 'P4ssw0rd_*';
    if (password.trim() === validPassword) {
      setActiveRole('admin');
      playSuccess();
      return true;
    }
    playWarning();
    return false;
  };

  const logoutRole = () => {
    setActiveRole('guest');
    playTap();
  };

  // Determine student today status
  const getStudentTodayStatus = useCallback((studentId: string, targetDate: string = getTodayDateString()): TodayStudentStatus => {
    const student = state.students.find(s => s.id === studentId);
    if (!student) {
      return {
        status: 'Belum Absen',
        record: null,
        isActiveDay: true,
        industry: null,
        dayName: '',
      };
    }

    const industry = state.industries.find(i => i.id === student.industryId) || null;
    const dateParts = targetDate.split('-');
    const dateObj = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
    const dayName = INDONESIAN_DAYS[dateObj.getDay()];

    const record = state.attendanceRecords.find(r => r.studentId === studentId && r.date === targetDate) || null;

    if (record) {
      return {
        status: record.status,
        record,
        isActiveDay: true,
        industry,
        dayName,
      };
    }

    // Check industry schedule
    const activeDays = industry?.activeDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    const isActiveDay = activeDays.includes(dayName);

    if (!isActiveDay) {
      return {
        status: 'Libur',
        record: null,
        isActiveDay: false,
        industry,
        dayName,
        reason: `Hari ${dayName} adalah hari libur di ${industry?.name || 'industri ini'}`,
      };
    }

    return {
      status: 'Belum Absen',
      record: null,
      isActiveDay: true,
      industry,
      dayName,
      reason: `Belum melakukan presensi pada hari kerja aktif (${industry?.workHours || '08:00 - 16:00'})`,
    };
  }, [state.students, state.industries, state.attendanceRecords]);

  // Submit attendance and narrative journal
  const submitAttendance = async (data: {
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
    journal?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    accuracyMeter?: number;
    verified?: boolean;
    date?: string;
    time?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const student = state.students.find(s => s.id === data.studentId);
    if (!student) {
      playWarning();
      return { success: false, message: 'Data siswa tidak ditemukan' };
    }

    const date = data.date || getTodayDateString();
    const now = new Date();
    const time = data.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // STRICT ANTI-DOUBLE ATTENDANCE CHECK:
    // If a record already exists for this student on this date, reject duplicate submissions!
    const existingRecord = (state.attendanceRecords || []).find(
      r => r.studentId === data.studentId && r.date === date
    );
    if (existingRecord) {
      playWarning();
      return {
        success: false,
        message: 'Presensi untuk hari ini sudah terkirim. Double absensi tidak diperbolehkan. Jika ada kesalahan data, silakan minta Guru Pembimbing untuk menghapus presensi hari ini agar Anda dapat mengisi ulang.',
      };
    }

    const minLength = state.appSettings.minJournalLength || 200;
    if (data.status === 'Hadir') {
      const journalText = (data.journal || '').trim();
      if (journalText.length < minLength) {
        playWarning();
        return {
          success: false,
          message: `Jurnal wajib naratif minimal ${minLength} karakter (Saat ini: ${journalText.length} karakter).`,
        };
      }
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: data.studentId,
      studentName: student.name,
      industryId: student.industryId,
      industryName: student.industryName,
      departmentName: student.departmentName || '',
      date,
      time,
      status: data.status,
      notes: data.notes || '',
      journal: data.journal || '',
      latitude: data.latitude,
      longitude: data.longitude,
      locationName: data.locationName,
      accuracyMeter: data.accuracyMeter,
      verified: data.verified ?? true,
      createdAt: new Date().toISOString(),
    };

    const updatedRecords = [
      newRecord,
      ...state.attendanceRecords.filter(r => !(r.studentId === data.studentId && r.date === date)),
    ];

    const newState: TeMaState = {
      ...state,
      attendanceRecords: updatedRecords,
    };

    await pushStateToCloud(newState);
    playSuccess();

    return { success: true, message: `Presensi & jurnal berhasil disimpan sebagai ${data.status}!` };
  };

  // ==================== CRUD GURU ====================
  const saveDepartment = async (deptData: Partial<Department> & { name: string; code?: string }) => {
    let updatedDepartments: Department[];
    if (deptData.id) {
      updatedDepartments = (state.departments || []).map(d =>
        d.id === deptData.id ? { ...d, ...deptData } as Department : d
      );
    } else {
      const newDept: Department = {
        id: `dept-${Date.now()}`,
        name: deptData.name.trim(),
        code: deptData.code?.trim() || deptData.name.substring(0, 4).toUpperCase(),
      };
      updatedDepartments = [...(state.departments || []), newDept];
    }

    const newState = { ...state, departments: updatedDepartments };
    await pushStateToCloud(newState);
    playSuccess();
  };

  const deleteDepartment = async (deptId: string) => {
    try {
      await fetch(`/api/departments/${deptId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(e);
    }
    const updated = (state.departments || []).filter(d => d.id !== deptId);
    const newState = { ...state, departments: updated };
    await pushStateToCloud(newState);
    playDelete();
  };

  const saveClass = async (classData: Partial<ClassProgram> & { name: string; departmentId: string }) => {
    const dept = (state.departments || []).find(d => d.id === classData.departmentId);
    const deptName = dept?.name || 'Umum';

    let updatedClasses: ClassProgram[];
    if (classData.id) {
      updatedClasses = (state.classes || []).map(c =>
        c.id === classData.id
          ? { ...c, ...classData, departmentName: deptName } as ClassProgram
          : c
      );
    } else {
      const newClass: ClassProgram = {
        id: `cls-${Date.now()}`,
        name: classData.name.trim(),
        departmentId: classData.departmentId,
        departmentName: deptName,
      };
      updatedClasses = [...(state.classes || []), newClass];
    }
    const newState = { ...state, classes: updatedClasses };
    await pushStateToCloud(newState);
    playSuccess();
  };

  const deleteClass = async (classId: string) => {
    try {
      await fetch(`/api/classes/${classId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(e);
    }
    const updated = (state.classes || []).filter(c => c.id !== classId);
    const newState = { ...state, classes: updated };
    await pushStateToCloud(newState);
    playDelete();
  };

  const saveIndustry = async (industryData: Partial<Industry> & { name: string; concentration: string }) => {
    let updatedIndustries: Industry[];
    if (industryData.id) {
      updatedIndustries = (state.industries || []).map(i => {
        if (i.id === industryData.id) {
          return {
            ...i,
            ...industryData,
            activeDays: industryData.activeDays || i.activeDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
          } as Industry;
        }
        return i;
      });
    } else {
      const newInd: Industry = {
        id: `ind-${Date.now()}`,
        name: industryData.name.trim(),
        concentration: industryData.concentration.trim(),
        address: industryData.address?.trim() || 'Alamat Industri',
        owner: industryData.owner?.trim() || 'Pembimbing / Owner',
        phone: industryData.phone?.trim() || '',
        activeDays: industryData.activeDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        workHours: industryData.workHours?.trim() || '08:00 - 16:00',
        latitude: industryData.latitude || -6.9175,
        longitude: industryData.longitude || 107.6191,
        radiusMeter: industryData.radiusMeter || 200,
      };
      updatedIndustries = [...(state.industries || []), newInd];
    }

    const updatedStudents = (state.students || []).map(s => {
      const matched = updatedIndustries.find(ind => ind.id === s.industryId);
      return matched ? { ...s, industryName: matched.name } : s;
    });

    const newState = { ...state, industries: updatedIndustries, students: updatedStudents };
    await pushStateToCloud(newState);
    playSuccess();
  };

  const deleteIndustry = async (industryId: string) => {
    try {
      await fetch(`/api/industries/${industryId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(e);
    }
    const updated = (state.industries || []).filter(i => i.id !== industryId);
    const newState = { ...state, industries: updated };
    await pushStateToCloud(newState);
    playDelete();
  };

  const saveStudent = async (studentData: Partial<Student> & { name: string; industryId: string; className?: string; classId?: string; departmentName?: string; departmentId?: string }) => {
    const rawClassName = (studentData.className || '').trim().toUpperCase();
    const rawDeptName = (studentData.departmentName || '').trim().toUpperCase();

    let assignedClass = (state.classes || []).find(c => 
      (studentData.classId && c.id === studentData.classId) ||
      (rawClassName && c.name.toUpperCase() === rawClassName)
    );

    const assignedIndustry = (state.industries || []).find(i => i.id === studentData.industryId);

    // Auto-register department if provided
    let updatedDepartments = state.departments || [];
    let deptId = studentData.departmentId || assignedClass?.departmentId || '';
    let finalDeptName = rawDeptName;

    if (rawDeptName) {
      const existingDept = updatedDepartments.find(d => d.name.toUpperCase() === rawDeptName || (d.code && d.code.toUpperCase() === rawDeptName));
      if (existingDept) {
        deptId = existingDept.id;
        finalDeptName = existingDept.name.toUpperCase();
      } else {
        deptId = `dep-${Date.now()}`;
        updatedDepartments = [...updatedDepartments, { id: deptId, name: rawDeptName, code: rawDeptName }];
      }
    } else if (deptId) {
      const foundDept = updatedDepartments.find(d => d.id === deptId);
      if (foundDept) finalDeptName = foundDept.name.toUpperCase();
    }

    const finalClassName = rawClassName || assignedClass?.name?.toUpperCase() || 'UMUM';
    const finalClassId = assignedClass ? assignedClass.id : (studentData.classId || `cls-${Date.now()}`);

    // Auto-register class into classes array if not present yet
    let updatedClasses = state.classes || [];
    if (finalClassName && !updatedClasses.some(c => c.name.toUpperCase() === finalClassName)) {
      updatedClasses = [...updatedClasses, {
        id: finalClassId,
        name: finalClassName,
        departmentId: deptId,
        departmentName: finalDeptName || 'UMUM',
      }];
    }

    let updatedStudents: Student[];
    if (studentData.id) {
      updatedStudents = (state.students || []).map(s => {
        if (s.id === studentData.id) {
          return {
            ...s,
            ...studentData,
            name: studentData.name.trim().toUpperCase(),
            classId: finalClassId,
            className: finalClassName,
            industryName: assignedIndustry?.name || s.industryName,
            departmentId: deptId || s.departmentId,
            departmentName: finalDeptName || s.departmentName,
            nis: '',
            phone: '',
          } as Student;
        }
        return s;
      });
    } else {
      const newStudent: Student = {
        id: `stu-${Date.now()}`,
        nis: '',
        name: studentData.name.trim().toUpperCase(),
        departmentId: deptId,
        departmentName: finalDeptName,
        classId: finalClassId,
        className: finalClassName,
        industryId: studentData.industryId,
        industryName: assignedIndustry?.name || 'Industri Terpilih',
        phone: '',
        status: studentData.status || 'Aktif',
      };
      updatedStudents = [...(state.students || []), newStudent];
    }

    const newState = { ...state, students: updatedStudents, classes: updatedClasses, departments: updatedDepartments };
    await pushStateToCloud(newState);
    playSuccess();
  };

  const deleteStudent = async (studentId: string) => {
    try {
      await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(e);
    }
    const updatedStudents = (state.students || []).filter(s => s.id !== studentId);
    const updatedRecords = (state.attendanceRecords || []).filter(r => r.studentId !== studentId);
    const newState = { ...state, students: updatedStudents, attendanceRecords: updatedRecords };
    if (activeStudentId === studentId) {
      setActiveStudentId(null);
    }
    await pushStateToCloud(newState);
    playDelete();
  };

  const deleteAttendanceRecord = async (recordId: string, studentId?: string, date?: string) => {
    try {
      if (recordId && !recordId.startsWith('synth-')) {
        await fetch(`/api/attendance/${recordId}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn(e);
    }

    const updatedRecords = (state.attendanceRecords || []).filter(r => {
      if (recordId && r.id === recordId) return false;
      if (studentId && date && r.studentId === studentId && r.date === date) return false;
      return true;
    });

    const newState = { ...state, attendanceRecords: updatedRecords };
    await pushStateToCloud(newState);
    playDelete();
  };

  // ==================== SYSTEM SETTINGS (ADMINISTRATOR ONLY) ====================
  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...state.appSettings, ...newSettings };
    const newState = { ...state, appSettings: updatedSettings };
    await pushStateToCloud(newState);
    playSuccess();
  };

  const clearAllData = async () => {
    try {
      const res = await fetch('/api/clear-all', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setState(result.data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result.data));
        setActiveStudentId(null);
        setSyncStatus('synced');
        playDelete();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadStarterTemplate = async () => {
    try {
      const res = await fetch('/api/load-template', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setState(result.data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result.data));
        setSyncStatus('synced');
        playSuccess();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==================== ACCURATE GPS GEOLOCATION ====================
  const fetchCurrentLocation = async (industry?: Industry | null): Promise<GeolocationResult> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve({
          success: false,
          error: 'Browser tidak mendukung pendeteksi lokasi GPS.',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const acc = Math.round(position.coords.accuracy);

          let distance = 0;
          let isWithin = true;
          if (industry && industry.latitude && industry.longitude) {
            distance = calculateDistanceMeters(lat, lng, industry.latitude, industry.longitude);
            isWithin = distance <= (industry.radiusMeter || 250);
          }

          // Real reverse geocode via OpenStreetMap Nominatim
          let formattedAddress = `Koordinat GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'id' } }
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData && geoData.display_name) {
                // Shorten address to road / suburb / city
                const addr = geoData.address || {};
                const shortParts = [
                  addr.road || addr.pedestrian || addr.building,
                  addr.suburb || addr.village || addr.neighbourhood,
                  addr.city || addr.town || addr.county
                ].filter(Boolean);
                formattedAddress = shortParts.length > 0 ? shortParts.join(', ') : geoData.display_name;
              }
            }
          } catch (e) {
            console.warn('Reverse geocode lookup skipped:', e);
          }

          const locText = isWithin
            ? `${formattedAddress} (Akurasi ±${acc}m · Radius DUDI Terpenuhi)`
            : `${formattedAddress} (Akurasi ±${acc}m · Jarak ±${distance >= 1000 ? (distance/1000).toFixed(1) + ' km' : distance + ' m'} dari DUDI)`;

          resolve({
            success: true,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            locationName: locText,
            distanceToIndustry: distance,
            isWithinRadius: isWithin,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          let errDetail = 'Gagal mengakses GPS perangkat.';
          if (error.code === error.PERMISSION_DENIED) {
            errDetail = 'Izin akses lokasi ditolak. Harap izinkan akses lokasi pada browser Anda.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errDetail = 'Sinyal GPS tidak tersedia atau perangkat tidak dapat mendeteksi satelit.';
          } else if (error.code === error.TIMEOUT) {
            errDetail = 'Waktu permintaan GPS habis. Pastikan GPS aktif dan coba kembali.';
          }

          resolve({
            success: false,
            error: errDetail,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // Force fresh location reading
        }
      );
    });
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  };

  const sendLocalNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Notification error:', e);
      }
    }
  };

  return (
    <TeMaContext.Provider
      value={{
        state,
        loading,
        syncStatus,
        lastSyncTime,
        activeRole,
        loginAsMurid,
        loginAsGuru,
        loginAsAdmin,
        logoutRole,
        activeStudent,
        setActiveStudentId,
        getStudentTodayStatus,
        submitAttendance,
        saveDepartment,
        deleteDepartment,
        saveClass,
        deleteClass,
        saveIndustry,
        deleteIndustry,
        saveStudent,
        deleteStudent,
        deleteAttendanceRecord,
        saveSettings,
        clearAllData,
        loadStarterTemplate,
        fetchCurrentLocation,
        requestNotificationPermission,
        sendLocalNotification,
        activeStudentTab,
        setActiveStudentTab,
        activeGuruTab,
        setActiveGuruTab,
        triggerCloudSync: fetchCloudState,
      }}
    >
      {children}
    </TeMaContext.Provider>
  );
};

export const useTeMa = () => {
  const context = useContext(TeMaContext);
  if (!context) {
    throw new Error('useTeMa must be used within a TeMaProvider');
  }
  return context;
};
