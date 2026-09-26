import React, { useState, useMemo } from 'react';
import { useTeMa } from '../context/TeMaContext';
import {
  formatIndonesianDate,
  formatIndonesianDateShort,
  getTodayDateString,
  getDateRangeArray,
  exportToExcel
} from '../utils/helpers';
import { exportToPDF } from '../utils/pdfExport';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  BellRing,
  Search,
  Coffee,
  Calendar,
  Filter,
  FileText,
  MapPin,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart3,
  ListFilter,
  Trash2,
  AlertTriangle,
  X,
  FileDown
} from 'lucide-react';
import { playTap, playSuccess, playDelete, playWarning } from '../utils/sound';

interface Props {
  onOpenPrintModal: (filterParams: {
    startDate: string;
    endDate: string;
    date: string;
    classId: string;
    industryId: string;
    departmentId: string;
  }) => void;
}

export const TeacherRecapView: React.FC<Props> = ({ onOpenPrintModal }) => {
  const {
    state,
    getStudentTodayStatus,
    sendLocalNotification,
    deleteAttendanceRecord,
  } = useTeMa();

  // Date range state (Default: Hari ini)
  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [endDate, setEndDate] = useState<string>(getTodayDateString());

  // Sub-view: 'journals' (Daftar Jurnal & Presensi) | 'summary' (Ringkasan Per Siswa)
  const [activeViewMode, setActiveViewMode] = useState<'journals' | 'summary'>('journals');

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reminderSent, setReminderSent] = useState<boolean>(false);

  // Delete modal state
  const [recordToDelete, setRecordToDelete] = useState<{
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    journal: string;
    status: string;
  } | null>(null);

  // Generate date list within the selected range
  const dateRangeList = useMemo(() => {
    return getDateRangeArray(startDate, endDate);
  }, [startDate, endDate]);

  // Compute all attendance & journal items for all students across the selected date range
  const rangeAttendanceRecords = useMemo(() => {
    const recordsList: Array<{
      id: string;
      date: string;
      studentId: string;
      studentName: string;
      className: string;
      departmentName: string;
      departmentId: string;
      industryId: string;
      industryName: string;
      status: string;
      time: string;
      verified: boolean;
      latitude?: number;
      longitude?: number;
      locationName?: string;
      journal: string;
      notes: string;
      isActiveDay: boolean;
      hasActualRecord: boolean;
    }> = [];

    dateRangeList.forEach(targetDate => {
      (state.students || []).forEach(student => {
        const statusInfo = getStudentTodayStatus(student.id, targetDate);
        const record = statusInfo.record;

        recordsList.push({
          id: record ? record.id : `synth-${student.id}-${targetDate}`,
          date: targetDate,
          studentId: student.id,
          studentName: student.name,
          className: student.className || '-',
          departmentName: student.departmentName || '-',
          departmentId: student.departmentId || '',
          industryId: student.industryId || '',
          industryName: student.industryName || statusInfo.industry?.name || '-',
          status: statusInfo.status,
          time: record?.time || '-',
          verified: record?.verified ?? false,
          latitude: record?.latitude,
          longitude: record?.longitude,
          locationName: record?.locationName,
          journal: record?.journal || '',
          notes: record?.notes || statusInfo.reason || (statusInfo.status === 'Libur' ? 'Hari Libur Industri' : ''),
          isActiveDay: statusInfo.isActiveDay,
          hasActualRecord: !!record,
        });
      });
    });

    // Sort descending by date, then student name
    return recordsList.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [dateRangeList, state.students, getStudentTodayStatus]);

  // Filtered attendance records based on search and filters
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rangeAttendanceRecords.filter(item => {
      const matchSearch =
        !q ||
        item.studentName.toLowerCase().includes(q) ||
        item.className.toLowerCase().includes(q) ||
        item.departmentName.toLowerCase().includes(q) ||
        item.industryName.toLowerCase().includes(q) ||
        item.journal.toLowerCase().includes(q);

      const matchDept =
        selectedDept === 'all' ||
        item.departmentId === selectedDept ||
        item.departmentName.toLowerCase().includes(selectedDept.toLowerCase());

      const matchIndustry =
        selectedIndustry === 'all' || item.industryId === selectedIndustry;

      const matchStatus =
        statusFilter === 'all' || item.status === statusFilter;

      return matchSearch && matchDept && matchIndustry && matchStatus;
    });
  }, [rangeAttendanceRecords, searchQuery, selectedDept, selectedIndustry, statusFilter]);

  // Aggregate statistics per student for the selected date range
  const studentSummaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const students = (state.students || []).filter(student => {
      const matchSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        (student.className && student.className.toLowerCase().includes(q)) ||
        (student.departmentName && student.departmentName.toLowerCase().includes(q)) ||
        (student.industryName && student.industryName.toLowerCase().includes(q));

      const matchDept =
        selectedDept === 'all' ||
        student.departmentId === selectedDept ||
        (student.departmentName && student.departmentName.toLowerCase().includes(selectedDept.toLowerCase()));

      const matchIndustry =
        selectedIndustry === 'all' || student.industryId === selectedIndustry;

      return matchSearch && matchDept && matchIndustry;
    });

    return students.map(student => {
      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let belumAbsen = 0;
      let libur = 0;
      let journalsCount = 0;

      dateRangeList.forEach(targetDate => {
        const info = getStudentTodayStatus(student.id, targetDate);
        if (info.status === 'Hadir') {
          hadir++;
          if (info.record?.journal && info.record.journal.trim().length > 0) {
            journalsCount++;
          }
        } else if (info.status === 'Izin') {
          izin++;
        } else if (info.status === 'Sakit') {
          sakit++;
        } else if (info.status === 'Libur') {
          libur++;
        } else {
          belumAbsen++;
        }
      });

      const totalActiveDays = hadir + izin + sakit + belumAbsen;
      const rate = totalActiveDays > 0 ? Math.round((hadir / totalActiveDays) * 100) : 0;

      return {
        student,
        totalDays: dateRangeList.length,
        totalActiveDays,
        hadir,
        izin,
        sakit,
        belumAbsen,
        libur,
        rate,
        journalsCount,
      };
    });
  }, [state.students, dateRangeList, getStudentTodayStatus, searchQuery, selectedDept, selectedIndustry]);

  // Overall Range Stats
  const rangeStats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let belumAbsen = 0;
    let libur = 0;
    let totalJournals = 0;

    rangeAttendanceRecords.forEach(r => {
      if (r.status === 'Hadir') {
        hadir++;
        if (r.journal) totalJournals++;
      } else if (r.status === 'Izin') {
        izin++;
      } else if (r.status === 'Sakit') {
        sakit++;
      } else if (r.status === 'Libur') {
        libur++;
      } else {
        belumAbsen++;
      }
    });

    const activeTotal = hadir + izin + sakit + belumAbsen;
    const rate = activeTotal > 0 ? Math.round((hadir / activeTotal) * 100) : 0;

    return { hadir, izin, sakit, belumAbsen, libur, totalJournals, rate, totalRecords: rangeAttendanceRecords.length };
  }, [rangeAttendanceRecords]);

  // Confirm delete journal/attendance record
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteAttendanceRecord(recordToDelete.id, recordToDelete.studentId, recordToDelete.date);
      playDelete();
      setRecordToDelete(null);
    } catch (e) {
      console.error(e);
      playWarning();
    }
  };

  // Broadcast Reminder to students who haven't submitted today
  const handleSendReminder = () => {
    playTap();
    const today = getTodayDateString();
    const unsubmittedToday = (state.students || []).filter(s => {
      const statusInfo = getStudentTodayStatus(s.id, today);
      return statusInfo.status === 'Belum Absen' && statusInfo.isActiveDay;
    });

    if (unsubmittedToday.length === 0) {
      sendLocalNotification(
        '✓ Presensi Lengkap',
        'Semua siswa magang yang aktif hari ini telah mengirimkan presensi.'
      );
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 3000);
      return;
    }

    sendLocalNotification(
      '⚠️ Peringatan Presensi Guru TeMa',
      `Terdapat ${unsubmittedToday.length} siswa magang yang belum melakukan presensi hari ini.`
    );
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 4000);
  };

  // Export to Excel (Styled .xls format with colors and full journals)
  const handleExportExcel = () => {
    playTap();
    const exportData = filteredRecords.map(item => ({
      id: item.id,
      studentId: item.studentId,
      studentName: item.studentName,
      industryId: item.industryId,
      industryName: item.industryName,
      departmentName: item.departmentName,
      date: item.date,
      time: item.time,
      status: item.status as any,
      notes: item.notes,
      journal: item.journal || '-',
      latitude: item.latitude,
      longitude: item.longitude,
      locationName: item.locationName,
      verified: item.verified,
      createdAt: new Date().toISOString(),
    }));

    const dateRangeLabel = startDate === endDate
      ? formatIndonesianDate(startDate)
      : `${formatIndonesianDateShort(startDate)} s/d ${formatIndonesianDateShort(endDate)}`;

    exportToExcel(
      exportData,
      state.students,
      state.industries,
      `Rekap_TeMa_${startDate}_sd_${endDate}`,
      dateRangeLabel,
      state.appSettings.schoolName,
      state.appSettings.academicYear
    );
    playSuccess();
  };

  const handleExportPDF = () => {
    playTap();
    const pdfData = filteredRecords.map(item => ({
      id: item.id,
      date: item.date,
      studentId: item.studentId,
      studentName: item.studentName,
      className: item.className,
      departmentName: item.departmentName,
      industryName: item.industryName,
      status: item.status,
      time: item.time,
      journal: item.journal,
      notes: item.notes,
      verified: item.verified,
    }));

    exportToPDF({
      reportData: pdfData,
      schoolName: state.appSettings.schoolName,
      academicYear: state.appSettings.academicYear,
      startDate,
      endDate,
      stats: {
        total: rangeStats.totalRecords,
        hadir: rangeStats.hadir,
        izin: rangeStats.izin,
        sakit: rangeStats.sakit,
        belumAbsen: rangeStats.belumAbsen,
        libur: rangeStats.libur,
        rate: rangeStats.rate,
      },
    });
    playSuccess();
  };

  const handleOpenPrint = () => {
    playTap();
    onOpenPrintModal({
      startDate,
      endDate,
      date: endDate,
      classId: 'all',
      industryId: selectedIndustry,
      departmentId: selectedDept,
    });
  };

  return (
    <div className="p-3.5 space-y-3.5 pb-24 text-slate-100 max-w-full overflow-x-hidden">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            Portal Rekapitulasi Guru
          </span>
          <h2 className="text-sm font-bold text-white">Monitoring Jurnal &amp; Presensi</h2>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-semibold shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Realtime Cloud</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. DATE RANGE CONTROLS (RENTANG TANGGAL DARI - SAMPAI)   */}
      {/* ======================================================== */}
      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Pilihan Rentang Tanggal</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {dateRangeList.length} Hari Dipilih
          </span>
        </div>

        {/* Date Pickers: DARI TANGGAL -> SAMPAI TANGGAL */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Dari Tanggal (Mulai):
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                const val = e.target.value;
                setStartDate(val);
                if (val > endDate) setEndDate(val);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-xl bg-slate-800 border border-slate-700 font-semibold text-white focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Sampai Tanggal (Selesai):
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-xl bg-slate-800 border border-slate-700 font-semibold text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Action Buttons: Export Styled Excel + Unduh PDF + Cetak / Preview */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full py-2 px-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-600/25 transition-all truncate"
            title="Unduh File Excel Berwarna"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Unduh Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="w-full py-2 px-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md shadow-indigo-600/25 transition-all truncate"
            title="Unduh Laporan PDF Resmi"
          >
            <FileDown className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Unduh PDF</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPrint}
            className="w-full py-2 px-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-all truncate"
            title="Pratinjau Cetak / Print"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Pratinjau</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATS SUMMARY CARDS FOR SELECTED RANGE                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <span className="text-[9px] text-slate-400 block font-semibold">Kehadiran</span>
          <span className="text-sm font-extrabold text-emerald-400 font-mono">
            {rangeStats.rate}%
          </span>
          <span className="text-[8px] text-slate-500 block">{rangeStats.hadir} Hadir</span>
        </div>

        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <span className="text-[9px] text-slate-400 block font-semibold">Izin / Sakit</span>
          <span className="text-sm font-extrabold text-cyan-400 font-mono">
            {rangeStats.izin + rangeStats.sakit}
          </span>
          <span className="text-[8px] text-slate-500 block">{rangeStats.izin}I / {rangeStats.sakit}S</span>
        </div>

        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <span className="text-[9px] text-slate-400 block font-semibold">Alpa / Belum</span>
          <span className="text-sm font-extrabold text-rose-400 font-mono">
            {rangeStats.belumAbsen}
          </span>
          <span className="text-[8px] text-slate-500 block">Belum Isi</span>
        </div>

        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <span className="text-[9px] text-slate-400 block font-semibold">Jurnal Masuk</span>
          <span className="text-sm font-extrabold text-amber-400 font-mono">
            {rangeStats.totalJournals}
          </span>
          <span className="text-[8px] text-slate-500 block">Narasi</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MODE SWITCH: LOG JURNAL vs REKAP PER SISWA            */}
      {/* ======================================================== */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            playTap();
            setActiveViewMode('journals');
          }}
          className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            activeViewMode === 'journals'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Log Jurnal &amp; Presensi ({filteredRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTap();
            setActiveViewMode('summary');
          }}
          className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            activeViewMode === 'summary'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Rekap Per Siswa ({studentSummaries.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. SEARCH & FILTERS (NO CLASS FILTER, UPPERCASE INPUT)  */}
      {/* ======================================================== */}
      <div className="space-y-2 bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value.toUpperCase())}
            placeholder="CARI NAMA SISWA, KELAS, JURUSAN, ATAU KATA KUNCI JURNAL..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400 uppercase font-semibold placeholder-slate-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Program Keahlian Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={e => {
                playTap();
                setSelectedDept(e.target.value);
              }}
              className="w-full text-[10px] py-1.5 px-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-400 uppercase font-semibold"
            >
              <option value="all">SEMUA PROGRAM KEAHLIAN</option>
              {(state.departments || []).map(d => (
                <option key={d.id} value={d.id}>
                  {d.name.toUpperCase()} {d.code ? `(${d.code.toUpperCase()})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Industry Filter */}
          <div>
            <select
              value={selectedIndustry}
              onChange={e => {
                playTap();
                setSelectedIndustry(e.target.value);
              }}
              className="w-full text-[10px] py-1.5 px-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-400 uppercase font-semibold"
            >
              <option value="all">SEMUA MITRA DUDI</option>
              {(state.industries || []).map(i => (
                <option key={i.id} value={i.id}>
                  {i.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status filter pills (For Journal Log mode) */}
        {activeViewMode === 'journals' && (
          <div className="flex gap-1 overflow-x-auto no-scrollbar pt-0.5">
            {['all', 'Hadir', 'Belum Absen', 'Izin', 'Sakit', 'Libur'].map(st => (
              <button
                key={st}
                onClick={() => {
                  playTap();
                  setStatusFilter(st);
                }}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {st === 'all' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. VIEW 1: DAFTAR JURNAL & PRESENSI LENGKAP             */}
      {/* ======================================================== */}
      {activeViewMode === 'journals' && (
        <div className="space-y-2.5 min-w-0 max-w-full">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Daftar Log Presensi &amp; Jurnal ({filteredRecords.length})</span>
            <span>
              {startDate === endDate
                ? formatIndonesianDateShort(startDate)
                : `${formatIndonesianDateShort(startDate)} - ${formatIndonesianDateShort(endDate)}`}
            </span>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 space-y-1">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-white">Tidak Ada Data Presensi atau Jurnal</p>
              <p className="text-[10px] text-slate-400 max-w-[260px] mx-auto">
                Coba sesuaikan rentang tanggal atau filter pencarian di atas.
              </p>
            </div>
          ) : (
            filteredRecords.map(item => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl bg-slate-900 border transition-all space-y-2 shadow-sm min-w-0 max-w-full overflow-hidden ${
                  item.status === 'Hadir'
                    ? 'border-emerald-500/30'
                    : item.status === 'Belum Absen'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : item.status === 'Izin' || item.status === 'Sakit'
                    ? 'border-cyan-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Header: Date + Student Info + Status Badge + Delete Button */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap min-w-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
                        {item.date}
                      </span>
                      <span className="text-xs font-bold text-white uppercase break-words min-w-0">
                        {item.studentName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 min-w-0">
                      <span className="font-bold text-cyan-400 bg-cyan-500/10 px-1 rounded uppercase shrink-0">
                        {item.className}
                      </span>
                      {item.departmentName && item.departmentName !== '-' && (
                        <span className="text-indigo-300 font-semibold bg-indigo-500/10 px-1 rounded uppercase truncate max-w-[120px]">
                          {item.departmentName}
                        </span>
                      )}
                      <span>&bull;</span>
                      <span className="text-slate-300 truncate max-w-[140px] uppercase">
                        {item.industryName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        item.status === 'Hadir'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : item.status === 'Libur'
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : item.status === 'Izin' || item.status === 'Sakit'
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      }`}
                    >
                      {item.status}
                    </span>

                    {/* Guru can delete student entry if already filled / submitted */}
                    {item.hasActualRecord && (
                      <button
                        type="button"
                        onClick={() => {
                          playWarning();
                          setRecordToDelete({
                            id: item.id,
                            studentId: item.studentId,
                            studentName: item.studentName,
                            date: item.date,
                            journal: item.journal,
                            status: item.status,
                          });
                        }}
                        title="Hapus isian presensi & jurnal siswa ini"
                        className="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-all active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Time & GPS Verification */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80 min-w-0">
                  <span className="flex items-center gap-1 truncate">
                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>Jam Presensi: <strong className="text-white font-mono">{item.time} WIB</strong></span>
                  </span>

                  {item.status === 'Hadir' && (
                    <span className={`shrink-0 ${item.verified ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}`}>
                      {item.verified ? '✓ Lokasi DUDI' : '⚠️ Di Luar Radius'}
                    </span>
                  )}
                </div>

                {/* GPS Location details if present */}
                {item.locationName && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 uppercase truncate min-w-0">
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">{item.locationName}</span>
                  </p>
                )}

                {/* Narrative Journal Content Box (Strictly Wrap Words & Prevent Overflow) */}
                {item.journal ? (
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/90 space-y-1 min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] font-bold text-cyan-300">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                        Jurnal Kegiatan Siswa:
                      </span>
                      <span className="text-slate-500 font-mono text-[9px] shrink-0">
                        {item.journal.length} Karakter
                      </span>
                    </div>
                    <div className="w-full min-w-0 max-w-full overflow-hidden">
                      <p className="text-[11px] text-slate-200 leading-relaxed uppercase whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] max-w-full">
                        {item.journal}
                      </p>
                    </div>
                  </div>
                ) : item.notes && item.status !== 'Hadir' ? (
                  <div className="bg-cyan-950/30 p-2 rounded-xl border border-cyan-500/20 text-[10px] text-cyan-200 min-w-0 max-w-full overflow-hidden">
                    <span className="font-bold">Keterangan: </span>
                    <span className="uppercase break-words [overflow-wrap:anywhere]">{item.notes}</span>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. VIEW 2: REKAPITULASI AGREGAT PER SISWA               */}
      {/* ======================================================== */}
      {activeViewMode === 'summary' && (
        <div className="space-y-2.5 min-w-0 max-w-full">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Rekapitulasi Total Per Siswa ({studentSummaries.length})</span>
            <span>{dateRangeList.length} Hari Kerja / Kalender</span>
          </div>

          {studentSummaries.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-white">Tidak Ada Data Siswa</p>
            </div>
          ) : (
            studentSummaries.map(({ student, hadir, izin, sakit, belumAbsen, rate, journalsCount }) => (
              <div
                key={student.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-sm min-w-0 max-w-full overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white uppercase break-words">{student.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate uppercase">
                      <span className="text-cyan-400 font-semibold">{student.className}</span>
                      {student.departmentName && ` • ${student.departmentName}`}
                      {` • ${student.industryName}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border ${
                        rate >= 80
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : rate >= 60
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {rate}% Hadir
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-5 gap-1 text-center pt-1 border-t border-slate-800 text-[10px]">
                  <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-mono font-bold text-emerald-400 text-xs block">{hadir}</span>
                    <span className="text-[9px] text-slate-400">Hadir</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-mono font-bold text-cyan-400 text-xs block">{izin}</span>
                    <span className="text-[9px] text-slate-400">Izin</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-mono font-bold text-amber-400 text-xs block">{sakit}</span>
                    <span className="text-[9px] text-slate-400">Sakit</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-mono font-bold text-rose-400 text-xs block">{belumAbsen}</span>
                    <span className="text-[9px] text-slate-400">Alpa</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-mono font-bold text-indigo-400 text-xs block">{journalsCount}</span>
                    <span className="text-[9px] text-slate-400">Jurnal</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL CONFIRMATION: HAPUS JURNAL & PRESENSI SISWA     */}
      {/* ======================================================== */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="p-2 rounded-2xl bg-rose-500/15 border border-rose-500/30">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Hapus Isian Jurnal / Presensi</h3>
                  <span className="text-[10px] text-slate-400 block font-semibold">Tindakan Pembimbing</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
              <div className="text-slate-400 text-[11px]">
                Nama Siswa: <strong className="text-white uppercase">{recordToDelete.studentName}</strong>
              </div>
              <div className="text-slate-400 text-[11px]">
                Tanggal: <strong className="text-amber-400">{formatIndonesianDate(recordToDelete.date)}</strong>
              </div>
              <div className="text-slate-400 text-[11px]">
                Status Tercatat: <strong className="text-cyan-300">{recordToDelete.status}</strong>
              </div>

              {recordToDelete.journal && (
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block font-semibold mb-1">Cuplikan Jurnal:</span>
                  <p className="text-[10px] text-slate-300 line-clamp-3 uppercase leading-relaxed italic bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    "{recordToDelete.journal}"
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Setelah dihapus, isian jurnal dan status presensi siswa ini akan dikembalikan menjadi <strong>Belum Absen</strong> sehingga siswa dapat menginput ulang presensinya.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
