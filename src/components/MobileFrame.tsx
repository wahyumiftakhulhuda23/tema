import React from 'react';
import { useTeMa } from '../context/TeMaContext';
import {
  Home,
  Clock,
  ClipboardList,
  Users,
  LogOut,
  Sparkles,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { motion } from 'motion/react';
import { playTap, playSwitch } from '../utils/sound';

interface Props {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<Props> = ({ children }) => {
  const {
    activeRole,
    logoutRole,
    activeStudentTab,
    setActiveStudentTab,
    activeGuruTab,
    setActiveGuruTab,
  } = useTeMa();

  const handleStudentTabSwitch = (tab: 'home' | 'history') => {
    playSwitch();
    setActiveStudentTab(tab);
  };

  const handleGuruTabSwitch = (tab: 'recap' | 'master_data') => {
    playSwitch();
    // maps to 'recap' or 'students' (master data)
    setActiveGuruTab(tab === 'recap' ? 'recap' : 'students');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 sm:p-4 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* 9:16 Mobile Canvas Container (Clean, responsive, NO fake phone punch hole / speaker) */}
      <div className="relative w-full max-w-[420px] aspect-[9/16] max-h-[890px] h-[100dvh] sm:h-[890px] bg-slate-950 sm:rounded-[36px] overflow-hidden shadow-2xl flex flex-col border sm:border-slate-800/80 ring-1 ring-white/5">
        
        {/* Sleek App Top Bar Header */}
        <header className="bg-slate-900/95 backdrop-blur-md px-3.5 py-3 border-b border-slate-800/80 flex items-center justify-between shrink-0 z-20">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 text-white flex items-center justify-center font-black text-xs shadow-md shadow-indigo-600/30">
              TM
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black tracking-tight text-white">
                  TeMa
                </h1>
                {/* Active Role Badge (NO "9:16" text!) */}
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                    activeRole === 'guru'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : activeRole === 'admin'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : activeRole === 'murid'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  }`}
                >
                  {activeRole === 'guru'
                    ? 'Guru'
                    : activeRole === 'admin'
                    ? 'Administrator'
                    : activeRole === 'murid'
                    ? 'Murid'
                    : 'Portal'}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-semibold tracking-wide">
                Tefa &amp; Magang
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5">
            {/* If in Murid, Guru, or Admin mode: Show simple "Ganti Peran" button to return to 3 choices */}
            {activeRole !== 'guest' && (
              <button
                onClick={() => {
                  playTap();
                  logoutRole();
                }}
                className="py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Kembali ke Pilihan Peran (Murid, Guru, Admin)"
              >
                <LogOut className="w-3 h-3 text-cyan-400" />
                <span>Ganti Peran</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content Body in Dark Theme */}
        <main className="flex-1 overflow-y-auto no-scrollbar bg-slate-950 relative text-slate-100 flex flex-col">
          {children}
        </main>

        {/* ============================================================== */}
        {/* BOTTOM NAVIGATION BARS (Only for Active Authenticated Roles)     */}
        {/* ============================================================== */}

        {/* 1. STUDENT VIEW NAVIGATION (Strictly 2 tabs) */}
        {activeRole === 'murid' && (
          <nav className="shrink-0 h-15 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 grid grid-cols-2 items-center px-4 z-30 shadow-2xl">
            <button
              onClick={() => handleStudentTabSwitch('home')}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all relative ${
                activeStudentTab === 'home' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Presensi Harian</span>
              {activeStudentTab === 'home' && (
                <motion.div
                  layoutId="studentTabIndicator"
                  className="w-7 h-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full absolute bottom-1 shadow-sm shadow-cyan-400/50"
                />
              )}
            </button>

            <button
              onClick={() => handleStudentTabSwitch('history')}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all relative ${
                activeStudentTab === 'history' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Riwayat &amp; Rekap</span>
              {activeStudentTab === 'history' && (
                <motion.div
                  layoutId="studentTabIndicator"
                  className="w-7 h-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full absolute bottom-1 shadow-sm shadow-cyan-400/50"
                />
              )}
            </button>
          </nav>
        )}

        {/* 2. GURU VIEW NAVIGATION (Strictly Rekap & Master Data, NO system settings) */}
        {activeRole === 'guru' && (
          <nav className="shrink-0 h-15 bg-slate-900/98 backdrop-blur-lg border-t border-amber-500/20 grid grid-cols-2 items-center px-4 z-30 shadow-2xl">
            <button
              onClick={() => handleGuruTabSwitch('recap')}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all relative ${
                activeGuruTab === 'recap' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Rekap Presensi &amp; Jurnal</span>
              {activeGuruTab === 'recap' && (
                <motion.div
                  layoutId="teacherTabIndicator"
                  className="w-7 h-1 bg-amber-400 rounded-full absolute bottom-1 shadow-sm shadow-amber-400/50"
                />
              )}
            </button>

            <button
              onClick={() => handleGuruTabSwitch('master_data')}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all relative ${
                activeGuruTab !== 'recap' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Data Siswa &amp; DUDI</span>
              {activeGuruTab !== 'recap' && (
                <motion.div
                  layoutId="teacherTabIndicator"
                  className="w-7 h-1 bg-amber-400 rounded-full absolute bottom-1 shadow-sm shadow-amber-400/50"
                />
              )}
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};
