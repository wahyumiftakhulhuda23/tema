import React, { useState, useEffect, useMemo } from 'react';
import { useTeMa } from '../context/TeMaContext';
import { AttendanceStatus, Student } from '../types';
import { getTodayDateString, formatIndonesianDate } from '../utils/helpers';
import {
  MapPin,
  Building2,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Sparkles,
  Send,
  BellRing,
  FileText,
  AlertTriangle,
  Search,
  ExternalLink,
  ChevronRight,
  User,
  Lock,
  Clock,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTap, playSuccess, playWarning } from '../utils/sound';

export const StudentHomeView: React.FC = () => {
  const {
    activeStudent,
    setActiveStudentId,
    getStudentTodayStatus,
    submitAttendance,
    fetchCurrentLocation,
    requestNotificationPermission,
    state,
  } = useTeMa();

  const todayStr = getTodayDateString();
  const todayStatus = activeStudent ? getStudentTodayStatus(activeStudent.id, todayStr) : null;
  const isAlreadySubmitted = !!todayStatus?.record;
  const studentIndustry = todayStatus?.industry;

  // Student directory search state (Input otomatis HURUF KAPITAL)
  const [studentSearch, setStudentSearch] = useState('');

  // Form states
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('Hadir');
  const [notes, setNotes] = useState('');
  const [journal, setJournal] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationData, setLocationData] = useState<{
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    locationName?: string;
    isWithinRadius?: boolean;
    distance?: number;
  }>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const minJournalChars = state.appSettings.minJournalLength || 200;
  const journalCharCount = journal.trim().length;
  const journalProgressPercent = Math.min(100, Math.round((journalCharCount / minJournalChars) * 100));

  // Load existing attendance record for today if already submitted
  useEffect(() => {
    if (todayStatus?.record) {
      setSelectedStatus(todayStatus.record.status);
      setNotes(todayStatus.record.notes || '');
      setJournal(todayStatus.record.journal || '');
      if (todayStatus.record.latitude && todayStatus.record.longitude) {
        setLocationData({
          latitude: todayStatus.record.latitude,
          longitude: todayStatus.record.longitude,
          locationName: todayStatus.record.locationName,
          isWithinRadius: todayStatus.record.verified,
          accuracy: todayStatus.record.accuracyMeter,
        });
      }
    } else {
      setSelectedStatus('Hadir');
      setNotes('');
      setJournal('');
      setLocationData({});
    }
  }, [todayStatus?.record, activeStudent?.id]);

  // Accurate GPS Location Fetcher
  const handleGetLocation = async () => {
    if (isAlreadySubmitted) return;
    playTap();
    setIsGettingLocation(true);
    try {
      const loc = await fetchCurrentLocation(studentIndustry);
      if (loc.success && loc.latitude && loc.longitude) {
        setLocationData({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          locationName: loc.locationName,
          isWithinRadius: loc.isWithinRadius,
          distance: loc.distanceToIndustry,
        });
        playSuccess();
      } else {
        playWarning();
        setToastMessage({
          type: 'error',
          text: loc.error || 'Gagal mendeteksi lokasi GPS. Pastikan izin lokasi aktif.',
        });
      }
    } catch {
      playWarning();
      setToastMessage({ type: 'error', text: 'Terjadi kesalahan saat mendeteksi GPS.' });
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Simulation button for indoor testing
  const handleSimulateDudiLocation = () => {
    if (isAlreadySubmitted) return;
    playTap();
    if (!studentIndustry || !studentIndustry.latitude || !studentIndustry.longitude) {
      setToastMessage({ type: 'error', text: 'Koordinat DUDI belum disetel oleh guru.' });
      return;
    }
    setLocationData({
      latitude: studentIndustry.latitude,
      longitude: studentIndustry.longitude,
      accuracy: 5,
      isWithinRadius: true,
      distance: 0,
      locationName: `${studentIndustry.name} - ${studentIndustry.address} (Verifikasi DUDI)`,
    });
    playSuccess();
    setToastMessage({ type: 'success', text: 'Koordinat DUDI diterapkan untuk simulasi kehadiran.' });
  };

  // Submit attendance handler
  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

    if (isAlreadySubmitted) {
      playWarning();
      setToastMessage({
        type: 'error',
        text: 'Presensi hari ini sudah terisi. Silakan hubungi Guru Pembimbing jika butuh perbaikan data.',
      });
      return;
    }

    if (selectedStatus === 'Hadir') {
      if (journalCharCount < minJournalChars) {
        playWarning();
        setToastMessage({
          type: 'error',
          text: `Jurnal kegiatan naratif minimal ${minJournalChars} karakter (saat ini: ${journalCharCount} karakter).`,
        });
        return;
      }

      if (!locationData.latitude || !locationData.longitude) {
        playWarning();
        setToastMessage({
          type: 'error',
          text: 'Harap verifikasi lokasi GPS presensi Anda terlebih dahulu.',
        });
        return;
      }
    }

    playTap();
    setSubmitLoading(true);

    try {
      const finalVerified =
        selectedStatus === 'Hadir' ? locationData.isWithinRadius ?? true : true;

      const res = await submitAttendance({
        studentId: activeStudent.id,
        status: selectedStatus,
        notes: notes.trim().toUpperCase(),
        journal: selectedStatus === 'Hadir' ? journal.trim().toUpperCase() : notes.trim().toUpperCase(),
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        locationName: locationData.locationName,
        accuracyMeter: locationData.accuracy,
        verified: finalVerified,
      });

      if (res.success) {
        setToastMessage({ type: 'success', text: res.message });
      } else {
        setToastMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Gagal menyimpan presensi.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEnableNotification = async () => {
    playTap();
    const granted = await requestNotificationPermission();
    setNotificationEnabled(granted);
    if (granted) {
      playSuccess();
      setToastMessage({ type: 'success', text: 'Notifikasi pengingat harian berhasil diaktifkan!' });
    }
  };

  // Filtered student list for directory view
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return (state.students || []).filter(s => {
      if (!q) return true;
      const matchName = s.name.toLowerCase().includes(q);
      const matchClass = (s.className || '').toLowerCase().includes(q);
      const matchDept = (s.departmentName || '').toLowerCase().includes(q);
      const matchIndustry = (s.industryName || '').toLowerCase().includes(q);
      return matchName || matchClass || matchDept || matchIndustry;
    });
  }, [state.students, studentSearch]);

  // ==================== CASE 1: NO STUDENTS EXIST IN DB ====================
  if (!state.students || state.students.length === 0) {
    return (
      <div className="p-5 flex flex-col items-center justify-center min-h-[60vh] text-center text-slate-100">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-indigo-500/10">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-bold text-white">Belum Ada Data Siswa</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
          Data siswa magang belum diinput oleh Guru Pembimbing. Silakan hubungi Guru Pembimbing untuk mendaftarkan nama siswa.
        </p>
      </div>
    );
  }

  // ==================== CASE 2: DIRECT STUDENT LISTING ====================
  // Students who have already submitted today are grayed out!
  if (!activeStudent) {
    return (
      <div className="p-3.5 space-y-3.5 text-slate-100 pb-20">
        {/* Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Daftar Siswa Magang &amp; TeFa
            </span>
          </div>
          <h2 className="text-sm font-bold text-white">Pilih Nama Siswa untuk Masuk</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Nama yang berwarna abu-abu menandakan sudah presensi hari ini.
          </p>
        </div>

        {/* Search Input (HURUF KAPITAL OTOMATIS) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value.toUpperCase())}
              placeholder="CARI NAMA ATAU KELAS SISWA..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 uppercase font-medium"
            />
          </div>
        </div>

        {/* Direct Student Cards List */}
        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
              <User className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">Tidak ada nama siswa yang cocok.</p>
            </div>
          ) : (
            filteredStudents.map(student => {
              const st = getStudentTodayStatus(student.id, todayStr);
              const submitted = !!st.record;

              return (
                <motion.button
                  key={student.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playTap();
                    setActiveStudentId(student.id);
                  }}
                  className={`w-full text-left p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all shadow-sm group ${
                    submitted
                      ? 'bg-slate-950/70 border-slate-800/60 opacity-65 hover:opacity-90'
                      : 'bg-slate-900 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold text-xs shrink-0 uppercase transition-colors ${
                        submitted
                          ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                          : 'bg-indigo-500/15 border-indigo-500/30 text-cyan-400 group-hover:bg-cyan-500/20'
                      }`}
                    >
                      {student.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4
                          className={`text-xs font-bold truncate uppercase transition-colors ${
                            submitted ? 'text-slate-300' : 'text-white group-hover:text-cyan-300'
                          }`}
                        >
                          {student.name}
                        </h4>
                        {submitted && (
                          <span title="Sudah Presensi Hari Ini">
                            <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate uppercase">
                        <span className={submitted ? 'text-slate-400 font-semibold' : 'text-cyan-400 font-semibold'}>
                          {student.className}
                        </span>
                        {student.departmentName && ` • ${student.departmentName}`}
                        {` • ${student.industryName}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        submitted
                          ? 'bg-slate-800/90 text-slate-300 border-slate-700'
                          : st.status === 'Libur'
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse'
                      }`}
                    >
                      {submitted ? `✓ Sudah (${st.status})` : st.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ==================== CASE 3: ACTIVE STUDENT PRESENSI & JURNAL VIEW ====================
  const isIzinOrSakit = selectedStatus === 'Izin' || selectedStatus === 'Sakit';

  return (
    <div className="p-3.5 space-y-3.5 text-slate-100 pb-24 max-w-full overflow-x-hidden">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xl ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600/90 text-white border border-emerald-400/30'
                : 'bg-rose-600/90 text-white border border-rose-400/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="break-words">{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs ml-2">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Student Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md uppercase">
              {activeStudent.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white truncate uppercase">{activeStudent.name}</h3>
              <p className="text-[10px] text-slate-400 font-medium truncate uppercase">
                <span className="text-cyan-400 font-bold">{activeStudent.className}</span>
                {activeStudent.departmentName && ` • ${activeStudent.departmentName}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playTap();
              setActiveStudentId(null); // Returns directly to student list!
            }}
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 py-1 px-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-colors shrink-0 flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Ganti Siswa</span>
          </button>
        </div>

        {/* Assigned Industry & Schedule Banner */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <Building2 className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate uppercase">{studentIndustry?.name || activeStudent.industryName}</span>
            </span>
            <span className="text-[9px] text-cyan-400 font-mono">
              {studentIndustry?.workHours || '08:00 - 16:00'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-850">
            <span>
              Hari Ini: <strong className="text-white uppercase">{todayStatus?.dayName || 'HARI KERJA'}</strong>
            </span>
            <span
              className={`font-bold px-1.5 py-0.2 rounded ${
                todayStatus?.isActiveDay
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {todayStatus?.isActiveDay ? 'Hari Aktif Kerja' : 'Hari Libur DUDI'}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LOCKED STATE BANNER: IF STUDENT ALREADY SUBMITTED TODAY */}
      {/* ======================================================== */}
      {isAlreadySubmitted ? (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Presensi Hari Ini Sudah Dikirim</h4>
                <span className="text-[10px] text-amber-400/90 font-semibold">Terkunci (Mencegah Double Absensi)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Anda telah berhasil mengirim presensi sebagai{' '}
              <strong className="text-emerald-400 uppercase">{todayStatus.record?.status}</strong> pada pukul{' '}
              <strong className="text-white font-mono">{todayStatus.record?.time} WIB</strong>.
            </p>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/20 text-[10px] text-amber-300/90">
              💡 <strong>Pemberitahuan:</strong> Jika ada kesalahan pengisian data atau ingin mengubah jurnal, silakan hubungi <strong>Guru Pembimbing</strong> untuk menghapus rekapan presensi hari ini agar formulir Anda terbuka kembali.
            </div>
          </div>

          {/* Read-Only Summary of today's submission */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Data Presensi yang Telah Terkirim
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {todayStatus.record?.status}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1">
              <div>Waktu Presensi: <strong className="text-white font-mono">{todayStatus.record?.time} WIB</strong></div>
              <div>Tanggal: <strong className="text-white">{formatIndonesianDate(todayStr)}</strong></div>
              {todayStatus.record?.locationName && (
                <div className="flex items-start gap-1 pt-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="break-words">{todayStatus.record.locationName}</span>
                </div>
              )}
            </div>

            {todayStatus.record?.journal && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 min-w-0 max-w-full overflow-hidden">
                <span className="text-[10px] font-bold text-cyan-300 block">Isian Jurnal Siswa:</span>
                <p className="text-[11px] text-slate-200 leading-relaxed uppercase whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">
                  {todayStatus.record.journal}
                </p>
              </div>
            )}

            {todayStatus.record?.notes && todayStatus.record.notes !== todayStatus.record.journal && (
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-300 min-w-0 max-w-full overflow-hidden">
                <span className="font-bold text-cyan-300 block mb-0.5">Catatan / Keterangan:</span>
                <p className="break-words break-all [overflow-wrap:anywhere] uppercase">{todayStatus.record.notes}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* NORMAL EDITABLE ATTENDANCE FORM (NOT SUBMITTED YET)      */
        /* ======================================================== */
        <>
          {/* Notification prompt if not enabled */}
          {!notificationEnabled && (
            <div className="p-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-[10px] text-slate-300">Aktifkan pengingat presensi harian otomatis</span>
              </div>
              <button
                onClick={handleEnableNotification}
                className="py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shrink-0"
              >
                Izinkan
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitAttendance} className="space-y-3.5">
            {/* Status Selection Buttons */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <label className="text-[11px] font-bold text-slate-300 block">Pilih Status Kehadiran:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Hadir', 'Izin', 'Sakit'] as AttendanceStatus[]).map(status => {
                  const isSelected = selectedStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        playTap();
                        setSelectedStatus(status);
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        isSelected
                          ? status === 'Hadir'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                            : status === 'Izin'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{status}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GPS Location Section (Only required for Hadir) */}
            {selectedStatus === 'Hadir' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Verifikasi Lokasi GPS Presensi
                  </label>

                  {locationData.latitude ? (
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        locationData.isWithinRadius
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}
                    >
                      {locationData.isWithinRadius ? '✓ Sesuai Radius DUDI' : '⚠️ Di Luar Radius'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-amber-400 font-semibold animate-pulse">
                      *Wajib Deteksi
                    </span>
                  )}
                </div>

                {locationData.latitude ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <p className="text-xs text-slate-200 font-medium break-words">
                      {locationData.locationName || 'Lokasi terdeteksi'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-850">
                      <span>Akurasi GPS: ~{locationData.accuracy || 10}m</span>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        {isGettingLocation ? 'Memperbarui...' : 'Perbarui Lokasi'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                    <p className="text-xs text-slate-400">Lokasi GPS belum dideteksi.</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Deteksi Lokasi GPS Akurat</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSimulateDudiLocation}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] border border-slate-700"
                      >
                        Simulasi Titik DUDI
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Narrative Journal (For Hadir) */}
            {selectedStatus === 'Hadir' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    Jurnal Kegiatan Harian (Naratif)
                  </label>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      journalCharCount >= minJournalChars
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {journalCharCount} / {minJournalChars} Karakter
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      journalCharCount >= minJournalChars
                        ? 'bg-emerald-400'
                        : journalCharCount >= minJournalChars * 0.5
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${journalProgressPercent}%` }}
                  />
                </div>

                {/* Textarea Jurnal */}
                <textarea
                  rows={5}
                  value={journal}
                  onChange={e => setJournal(e.target.value.toUpperCase())}
                  placeholder="DESKRIPSIKAN KEGIATAN MAGANG / TEFA ANDA HARI INI SECARA DETAIL (MINIMAL 200 KARAKTER). JELASKAN TUGAS YANG DIKERJAKAN, PERALATAN KERJA, PROSES KERJA, DAN HASIL YANG DICAPAI..."
                  className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none leading-relaxed uppercase"
                  required
                />

                {journalCharCount < minJournalChars && (
                  <p className="text-[10px] text-amber-400/90 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>Tambahkan minimal {minJournalChars - journalCharCount} karakter lagi untuk menyimpan.</span>
                  </p>
                )}
              </div>
            ) : (
              /* Izin / Sakit */
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-white block">
                    Keterangan Alasan ({selectedStatus}):
                  </label>
                  <span className="text-[10px] text-slate-400 italic">
                    (Opsional / Tidak Wajib)
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value.toUpperCase())}
                  placeholder={`TULISKAN KETERANGAN ATAU ALASAN ${selectedStatus.toUpperCase()} (TIDAK WAJIB)...`}
                  className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none uppercase"
                />
              </div>
            )}

            {/* Submit Attendance Button */}
            <button
              type="submit"
              disabled={submitLoading || (!isIzinOrSakit && journalCharCount < minJournalChars)}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
                !isIzinOrSakit && journalCharCount < minJournalChars
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {submitLoading
                  ? 'Menyimpan Presensi...'
                  : isIzinOrSakit
                  ? `Kirim Presensi (${selectedStatus})`
                  : 'Kirim Presensi & Jurnal Hari Ini'}
              </span>
            </button>
          </form>
        </>
      )}
    </div>
  );
};
