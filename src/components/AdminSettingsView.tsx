import React, { useState } from 'react';
import { useTeMa } from '../context/TeMaContext';
import {
  Sliders,
  ShieldCheck,
  Building,
  Calendar,
  FileText,
  Clock,
  KeyRound,
  Trash2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Database,
  CloudCheck,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTap, playSuccess } from '../utils/sound';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const AdminSettingsView: React.FC = () => {
  const {
    state,
    saveSettings,
    clearAllData,
    loadStarterTemplate,
    syncStatus,
    lastSyncTime
  } = useTeMa();

  const [schoolName, setSchoolName] = useState(state.appSettings.schoolName || 'SMK Negeri 1');
  const [academicYear, setAcademicYear] = useState(state.appSettings.academicYear || '2025/2026');
  const [minJournalLength, setMinJournalLength] = useState(state.appSettings.minJournalLength || 200);
  const [reminderTime, setReminderTime] = useState(state.appSettings.notificationReminderTime || '07:30');
  const [teacherPasscode, setTeacherPasscode] = useState(state.appSettings.teacherPasscode || '12345');
  const [adminPasscode, setAdminPasscode] = useState(state.appSettings.adminPasscode || 'P4ssw0rd_*');

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    playTap();
    await saveSettings({
      schoolName: schoolName.trim(),
      academicYear: academicYear.trim(),
      minJournalLength: Number(minJournalLength) || 200,
      notificationReminderTime: reminderTime,
      teacherPasscode: teacherPasscode.trim() || '12345',
      adminPasscode: adminPasscode.trim() || 'P4ssw0rd_*',
    });
    playSuccess();
    showToast('Pengaturan sistem berhasil disimpan ke Cloud!');
  };

  const handleConfirmClearAll = async () => {
    await clearAllData();
    setIsDeleteModalOpen(false);
    showToast('Seluruh data berhasil dikosongkan (Database Bersih)!');
  };

  const handleConfirmLoadTemplate = async () => {
    await loadStarterTemplate();
    setIsTemplateModalOpen(false);
    showToast('Template contoh data Magang & TeFa berhasil dimuat!');
  };

  const deptCount = state.departments?.length || 0;
  const classCount = state.classes?.length || 0;
  const industryCount = state.industries?.length || 0;
  const studentCount = state.students?.length || 0;
  const recordCount = state.attendanceRecords?.length || 0;

  return (
    <div className="p-3.5 space-y-4 text-slate-100 pb-24">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-2xl bg-emerald-600/90 border border-emerald-400/30 text-white text-xs font-semibold flex items-center justify-between shadow-xl"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              Portal Administrator
            </h2>
            <p className="text-[11px] text-slate-400">
              Pengaturan Aturan Sistem, Keamanan &amp; Database Aplikasi TeMa
            </p>
          </div>
        </div>
      </div>

      {/* Database Overview Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Status Data di Cloud</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
            Real-Time Aktif
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-xs font-black text-cyan-400">{studentCount}</span>
            <p className="text-[9px] text-slate-400 font-medium">Siswa</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-xs font-black text-indigo-400">{industryCount}</span>
            <p className="text-[9px] text-slate-400 font-medium">DUDI</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-xs font-black text-amber-400">{recordCount}</span>
            <p className="text-[9px] text-slate-400 font-medium">Presensi</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center pt-1">
          <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-300">{deptCount} Jurusan</span>
          </div>
          <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-300">{classCount} Rombel Kelas</span>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-4">
        {/* Section 1: Instansi & Akademik */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Building className="w-3.5 h-3.5 text-amber-400" />
            Identitas Sekolah / Instansi
          </h3>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Nama Sekolah / Lembaga:
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value.toUpperCase())}
              placeholder="CONTOH: SMK NEGERI 1 JAKARTA"
              className="w-full text-xs py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase font-semibold"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Tahun Ajaran Aktif:
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value.toUpperCase())}
              placeholder="CONTOH: 2025/2026"
              className="w-full text-xs py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase font-semibold"
              required
            />
          </div>
        </div>

        {/* Section 2: Aturan Jurnal & Presensi */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            Parameter Jurnal &amp; Notifikasi
          </h3>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Batas Minimal Karakter Jurnal Naratif:
              </label>
              <span className="text-xs font-bold text-cyan-400 font-mono">
                {minJournalLength} Karakter
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={500}
              step={10}
              value={minJournalLength}
              onChange={e => setMinJournalLength(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Standar 200 karakter memastikan laporan kegiatan siswa lebih komprehensif dan detail.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Waktu Pengingat Notifikasi Presensi:
            </label>
            <div className="relative">
              <input
                type="time"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Sistem akan memicu notifikasi kepada siswa jika belum absen pada jam ini di hari kerja.
            </p>
          </div>
        </div>

        {/* Section 3: Keamanan & Password */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <KeyRound className="w-3.5 h-3.5 text-rose-400" />
            Password &amp; Akses Peran
          </h3>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Password Akses Guru Pembimbing:
            </label>
            <input
              type="password"
              value={teacherPasscode}
              onChange={e => setTeacherPasscode(e.target.value)}
              placeholder="Masukkan Password Guru"
              className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Digunakan oleh guru untuk mengelola data siswa, DUDI &amp; rekapitulasi.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Password Akses Administrator:
            </label>
            <input
              type="password"
              value={adminPasscode}
              onChange={e => setAdminPasscode(e.target.value)}
              placeholder="Masukkan Password Admin"
              className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Digunakan untuk masuk ke konfigurasi sistem &amp; pemeliharaan database.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Simpan Seluruh Pengaturan Sistem
        </button>
      </form>

      {/* Database Operations Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Database className="w-3.5 h-3.5 text-rose-400" />
          Pemeliharaan Database &amp; Template
        </h3>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              playTap();
              setIsTemplateModalOpen(true);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Muat Template Contoh Data (RPL &amp; DKV)
          </button>

          <button
            type="button"
            onClick={() => {
              playTap();
              setIsDeleteModalOpen(true);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Kosongkan Seluruh Data (Reset Database Bersih)
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Kosongkan Semua Data?"
        itemName="Seluruh Data Siswa, Kelas, DUDI, dan Riwayat Absensi"
        itemType="database"
        onConfirm={handleConfirmClearAll}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-xs p-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Muat Contoh Data?</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Ini akan mengisi contoh Program Keahlian, Kelas, dan Industri DUDI untuk mempermudah uji coba aplikasi.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLoadTemplate}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
              >
                Muat Contoh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
