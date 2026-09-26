import React, { useState, useMemo } from 'react';
import { useTeMa } from '../context/TeMaContext';
import { formatIndonesianDate } from '../utils/helpers';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTap } from '../utils/sound';

export const StudentHistoryView: React.FC = () => {
  const { activeStudent, state } = useTeMa();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const studentRecords = useMemo(() => {
    if (!activeStudent) return [];
    return state.attendanceRecords
      .filter(r => r.studentId === activeStudent.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.attendanceRecords, activeStudent]);

  const filteredRecords = useMemo(() => {
    return studentRecords.filter(r => {
      const matchSearch =
        r.date.includes(searchTerm) ||
        (r.journal && r.journal.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [studentRecords, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = studentRecords.length;
    const hadir = studentRecords.filter(r => r.status === 'Hadir').length;
    const izin = studentRecords.filter(r => r.status === 'Izin').length;
    const sakit = studentRecords.filter(r => r.status === 'Sakit').length;
    const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
    return { total, hadir, izin, sakit, rate };
  }, [studentRecords]);

  if (!activeStudent) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        Silakan pilih nama siswa terlebih dahulu di Beranda.
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 text-slate-100">
      {/* Top summary stats */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-medium">Total</span>
          <span className="text-base font-bold text-white font-mono">{stats.total}</span>
        </div>
        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] text-emerald-400 block font-medium">Hadir</span>
          <span className="text-base font-bold text-emerald-400 font-mono">{stats.hadir}</span>
        </div>
        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] text-cyan-400 block font-medium">Izin</span>
          <span className="text-base font-bold text-cyan-400 font-mono">{stats.izin}</span>
        </div>
        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] text-amber-400 block font-medium">Sakit</span>
          <span className="text-base font-bold text-amber-400 font-mono">{stats.sakit}</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value.toUpperCase())}
            placeholder="Cari narasi jurnal atau tanggal..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 uppercase font-semibold"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {['all', 'Hadir', 'Izin', 'Sakit'].map(st => (
            <button
              key={st}
              onClick={() => {
                playTap();
                setStatusFilter(st);
              }}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {st === 'all' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      <div className="space-y-2">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-900 rounded-3xl border border-slate-800">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">Belum Ada Riwayat Presensi</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Presensi dan jurnal yang kamu kirimkan akan tersimpan aman di cloud.
            </p>
          </div>
        ) : (
          filteredRecords.map(record => {
            const isExpanded = expandedId === record.id;
            return (
              <div
                key={record.id}
                className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden transition-all"
              >
                <div
                  onClick={() => {
                    playTap();
                    setExpandedId(isExpanded ? null : record.id);
                  }}
                  className="p-3 cursor-pointer hover:bg-slate-800/50 flex items-center justify-between transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                          record.status === 'Hadir'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : record.status === 'Izin'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : record.status === 'Sakit'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {record.status}
                      </span>
                      <span className="text-[11px] font-bold text-white">
                        {formatIndonesianDate(record.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {record.time || '-'} WIB
                      </span>
                      {record.journal && (
                        <span className="flex items-center gap-1 text-cyan-400 font-medium truncate">
                          <FileText className="w-3 h-3" />
                          Jurnal ({record.journal.length} char)
                        </span>
                      )}
                    </div>
                  </div>

                  <button className="text-slate-500 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3 pb-3 pt-1 border-t border-slate-800 bg-slate-950/50 space-y-2 text-xs"
                    >
                      {/* GPS Details */}
                      {record.latitude && record.longitude && (
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-[10px] space-y-1">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1 font-semibold text-slate-200">
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              Titik Presensi GPS
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                record.verified
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {record.verified ? '✓ Terverifikasi DUDI' : 'Di Luar Radius'}
                            </span>
                          </div>
                          <p className="text-slate-400 truncate">{record.locationName}</p>
                          <a
                            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-cyan-400 font-medium hover:underline pt-0.5"
                          >
                            Buka di Google Maps
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}

                      {/* Journal Content */}
                      {record.journal && (
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                            <span className="flex items-center gap-1 text-cyan-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Narasi Jurnal Magang
                            </span>
                            <span className="text-slate-500 font-mono">
                              {record.journal.length} Karakter
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {record.journal}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      {record.notes && record.notes !== record.journal && (
                        <div className="bg-amber-500/10 p-2 rounded-xl text-[10px] text-amber-300 border border-amber-500/20">
                          <span className="font-bold block mb-0.5">Catatan:</span>
                          <p>{record.notes}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
