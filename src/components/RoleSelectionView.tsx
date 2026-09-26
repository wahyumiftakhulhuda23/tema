import React from 'react';
import { useTeMa } from '../context/TeMaContext';
import {
  GraduationCap,
  Users,
  ShieldCheck,
  ArrowRight,
  Clock,
  Sparkles,
  MapPin,
  Lock,
  Sliders,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { playTap } from '../utils/sound';

interface Props {
  onSelectGuru: () => void;
  onSelectAdmin: () => void;
}

export const RoleSelectionView: React.FC<Props> = ({ onSelectGuru, onSelectAdmin }) => {
  const { loginAsMurid, state } = useTeMa();

  const totalStudents = state.students?.length || 0;
  const totalIndustries = state.industries?.length || 0;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 text-slate-100 min-h-full">
      {/* Brand Hero */}
      <div className="text-center pt-2 pb-4">
        {/* Animated App Icon */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative inline-block mb-3"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 text-white flex items-center justify-center font-extrabold text-2xl shadow-xl shadow-indigo-500/25 mx-auto ring-4 ring-white/10">
            TM
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </span>
        </motion.div>

        <motion.h1
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-2xl font-black tracking-tight text-white"
        >
          TeMa
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-cyan-300 text-[11px] font-bold tracking-wide"
        >
          <span>Tefa &amp; Magang</span>
        </motion.div>

        <p className="text-[11px] text-slate-400 mt-2 max-w-[290px] mx-auto leading-relaxed">
          Sistem Informasi Presensi &amp; Jurnal Harian Siswa Teaching Factory dan Magang / PKL
        </p>

        {/* Live System Meta Pill */}
        <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-400 font-medium">
          <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {totalStudents} Siswa Terdata
          </span>
          <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {totalIndustries} DUDI Aktif
          </span>
        </div>
      </div>

      {/* 3 Role Selection Cards */}
      <div className="space-y-3 my-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
          Pilih Peran Pengguna:
        </div>

        {/* 1. MURID */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            playTap();
            loginAsMurid();
          }}
          className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 transition-all shadow-lg group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/15" />

          <div className="flex items-start gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                  Murid
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Akses Langsung
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Presensi Harian &amp; Jurnal Kegiatan
              </p>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                Absen harian 1-klik, verifikasi lokasi GPS, isi jurnal naratif min. 200 karakter, dan riwayat presensi.
              </p>
            </div>

            <div className="self-center pl-1 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>

        {/* 2. GURU */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            playTap();
            onSelectGuru();
          }}
          className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all shadow-lg group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/15" />

          <div className="flex items-start gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-md">
              <Users className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                  Guru Pembimbing
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Akses Guru
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Kelola Siswa, DUDI &amp; Rekapitulasi
              </p>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                Input data siswa, DUDI &amp; jadwal hari aktif, kelas, kirim notifikasi, cek riwayat, rekapitulasi, cetak PDF / Excel.
              </p>
            </div>

            <div className="self-center pl-1 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>

        {/* 3. ADMINISTRATOR */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            playTap();
            onSelectAdmin();
          }}
          className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 transition-all shadow-lg group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/15" />

          <div className="flex items-start gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  Administrator
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Password Khusus
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Pengaturan Sistem &amp; Database
              </p>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                Khusus konfigurasi aturan sistem: nama sekolah, jam operasional, min. karakter jurnal, radius GPS, dan kelola database.
              </p>
            </div>

            <div className="self-center pl-1 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* Footer Info */}
      <div className="pt-3 pb-1 text-center">
        <p className="text-[10px] text-slate-500 font-medium">
          TeMa &bull; Tefa &amp; Magang &bull; Data Otomatis Tersinkronisasi Cloud
        </p>
      </div>
    </div>
  );
};
