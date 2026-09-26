import React, { useState, useEffect, useMemo } from 'react';
import { useTeMa } from '../context/TeMaContext';
import { AttendanceStatus, Student } from '../types';
import { getTodayDateString } from '../utils/helpers';
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
  User
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

  // NOTE: Requirement: "ketika klik masuk sebagai siswa maka harus muncul daftar namanya dulu baru siswa klik tersebut."
  // Therefore, DO NOT auto-select any student! Always let the student choose from the directory list first!

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
  // Requirement: "untuk siswa yang klik izin dan sakit, maka tidak wajib mengisi deskripsi jurnal."
  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

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

  // Filtered student list for directory view (NO NIS FILTER)
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
  // "ketika klik masuk sebagai siswa maka harus muncul daftar namanya dulu baru siswa klik tersebut."
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
          <h2 className="text-sm font-bold text-white">Ketuk Nama Anda untuk Masuk</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Pilih nama Anda di bawah untuk mulai presensi dan mengisi jurnal kegiatan.
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

        {/* Direct Student Cards List (TANPA BADGE NIS) */}
        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
              <User className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">Tidak ada nama siswa yang cocok.</p>
            </div>
          ) : (
            filteredStudents.map(student => {
              const st = getStudentTodayStatus(student.id, todayStr);
              return (
                <motion.button
                  key={student.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playTap();
                    setActiveStudentId(student.id);
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 flex items-center justify-between gap-3 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-cyan-500/20 transition-colors uppercase">
                      {student.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate uppercase">
                        {student.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate uppercase">
                        <span className="text-cyan-400 font-semibold">{student.className}</span>
                        {student.departmentName && ` • ${student.departmentName}`}
                        {` • ${student.industryName}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        st.status === 'Hadir'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : st.status === 'Izin'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : st.status === 'Sakit'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : st.status === 'Libur'
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse'
                      }`}
                    >
                      {st.status}
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
    <div className="p-3.5 space-y-3.5 text-slate-100 pb-24">
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
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs ml-2">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Student Header Card (TANPA NIS) */}
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
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 py-1 px-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-colors shrink-0"
          >
            Ganti Siswa
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

      {/* Main Attendance Form */}
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
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    isSelected
                      ? status === 'Hadir'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                        : status === 'Izin'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                        : 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        {/* ==================== GPS GEOLOCATION CARD (ONLY IF HADIR) ==================== */}
        {selectedStatus === 'Hadir' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Verifikasi Lokasi GPS Presisi
              </span>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-[10px] font-bold flex items-center gap-1 transition-colors"
              >
                <Navigation className={`w-3 h-3 ${isGettingLocation ? 'animate-spin' : ''}`} />
                <span>{isGettingLocation ? 'Mendeteksi...' : 'Perbarui GPS'}</span>
              </button>
            </div>

            {/* GPS Result Box */}
            {locationData.latitude && locationData.longitude ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-white">
                    {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      (locationData.accuracy || 999) <= 30
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    Akurasi &plusmn;{locationData.accuracy || 10}m
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                  {locationData.locationName}
                </p>

                {/* Distance to DUDI indicator */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-850 text-[10px]">
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      locationData.isWithinRadius ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {locationData.isWithinRadius ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Dalam Radius DUDI ({studentIndustry?.radiusMeter || 250}m)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>
                          Jarak &plusmn;
                          {locationData.distance && locationData.distance >= 1000
                            ? (locationData.distance / 1000).toFixed(1) + ' km'
                            : (locationData.distance || 0) + ' m'}{' '}
                          dari DUDI
                        </span>
                      </>
                    )}
                  </span>

                  <a
                    href={`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-0.5 text-[10px] font-semibold"
                  >
                    <span>Buka Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
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

        {/* ==================== NARRATIVE JOURNAL (TANPA ISIAN OTOMATIS) ==================== */}
        {/* Requirement: "hilangkan isian otomatis untuk deskripsi jurnal siswa." */}
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

            {/* Textarea Jurnal (Otomatis HURUF KAPITAL, Tanpa Prompt Chips Otomatis) */}
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
          /* ==================== IZIN ATAU SAKIT (TIDAK WAJIB MENGISI DESKRIPSI) ==================== */
          /* Requirement: "untuk siswa yang klik izin dan sakit, maka tidak wajib mengisi deskripsi jurnal." */
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
        {/* For Izin and Sakit, no minimum character validation required */}
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
    </div>
  );
};
