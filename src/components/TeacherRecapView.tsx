import React, { useState, useMemo } from 'react';
import { useTeMa } from '../context/TeMaContext';
import {
  formatIndonesianDate,
  formatIndonesianDateShort,
  getTodayDateString,
  getPastDaysDateString,
  getFirstDayOfMonthDateString,
  getDateRangeArray,
  exportToExcel
} from '../utils/helpers';
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
  ListFilter
} from 'lucide-react';
import { playTap, playSuccess } from '../utils/sound';

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
  } = useTeMa();

  // Date range state (Default: 7 Hari Terakhir s/d Hari ini)
  const [startDate, setStartDate] = useState<string>(getPastDaysDateString(6));
  const [endDate, setEndDate] = useState<string>(getTodayDateString());
  const [activePreset, setActivePreset] = useState<'today' | '7days' | '30days' | 'thisMonth' | 'custom'>('7days');

  // Sub-view: 'journals' (Daftar Jurnal & Presensi) | 'summary' (Ringkasan Per Siswa)
  const [activeViewMode, setActiveViewMode] = useState<'journals' | 'summary'>('journals');

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reminderSent, setReminderSent] = useState<boolean>(false);

  // Set date range preset
  const handleApplyPreset = (preset: 'today' | '7days' | '30days' | 'thisMonth') => {
    playTap();
    setActivePreset(preset);
    const today = getTodayDateString();
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7days') {
      setStartDate(getPastDaysDateString(6));
      setEndDate(today);
    } else if (preset === '30days') {
      setStartDate(getPastDaysDateString(29));
      setEndDate(today);
    } else if (preset === 'thisMonth') {
      setStartDate(getFirstDayOfMonthDateString());
      setEndDate(today);
    }
  };

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
    }> = [];

    const studentMap = new Map((state.students || []).map(s => [s.id, s]));

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
    return (state.students || [])
      .filter(student => {
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
      })
      .map(student => {
        const studentRecords = rangeAttendanceRecords.filter(r => r.studentId === student.id);
        const totalDays = studentRecords.length;
        const hadir = studentRecords.filter(r => r.status === 'Hadir').length;
        const izin = studentRecords.filter(r => r.status === 'Izin').length;
        const sakit = studentRecords.filter(r => r.status === 'Sakit').length;
        const belumAbsen = studentRecords.filter(r => r.status === 'Belum Absen').length;
        const libur = studentRecords.filter(r => r.status === 'Libur').length;
        const activeDays = totalDays - libur;
        const rate = activeDays > 0 ? Math.round((hadir / activeDays) * 100) : 100;
        const journalsCount = studentRecords.filter(r => r.journal && r.journal.trim().length > 0).length;

        return {
          student,
          totalDays,
          hadir,
          izin,
          sakit,
          belumAbsen,
          libur,
          rate,
          journalsCount,
        };
      });
  }, [state.students, rangeAttendanceRecords, searchQuery, selectedDept, selectedIndustry]);

  // KPI Summary across the whole selected date range
  const summaryStats = useMemo(() => {
    const total = filteredRecords.length;
    const hadir = filteredRecords.filter(s => s.status === 'Hadir').length;
    const izin = filteredRecords.filter(s => s.status === 'Izin').length;
    const sakit = filteredRecords.filter(s => s.status === 'Sakit').length;
    const belumAbsen = filteredRecords.filter(s => s.status === 'Belum Absen').length;
    const libur = filteredRecords.filter(s => s.status === 'Libur').length;
    const activeTarget = total - libur;
    const attendancePercentage = activeTarget > 0 ? Math.round((hadir / activeTarget) * 100) : 100;
    const journalsCount = filteredRecords.filter(s => s.journal && s.journal.trim().length > 0).length;

    return { total, hadir, izin, sakit, belumAbsen, libur, attendancePercentage, journalsCount };
  }, [filteredRecords]);

  // Batch reminder for today's unsubmitted students
  const handleSendBatchReminder = () => {
    playTap();
    const today = getTodayDateString();
    const unsubmittedToday = rangeAttendanceRecords.filter(
      s => s.date === today && s.status === 'Belum Absen'
    );

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
    <div className="p-3.5 space-y-3.5 pb-24 text-slate-100">
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
            <span>Rentang Tanggal Rekapitulasi</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {dateRangeList.length} Hari Dipilih
          </span>
        </div>

        {/* Quick Date Range Preset Buttons */}
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => handleApplyPreset('today')}
            className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all text-center border ${
              activePreset === 'today'
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('7days')}
            className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all text-center border ${
              activePreset === '7days'
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('30days')}
            className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all text-center border ${
              activePreset === '30days'
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            30 Hari
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('thisMonth')}
            className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all text-center border ${
              activePreset === 'thisMonth'
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            Bulan Ini
          </button>
        </div>

        {/* Date Pickers: DARI TANGGAL -> SAMPAI TANGGAL */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Dari Tanggal (Mulai):
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setActivePreset('custom');
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
              onChange={e => {
                setEndDate(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-xl bg-slate-800 border border-slate-700 font-semibold text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Action Buttons: Export Styled Excel + Print PDF */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Unduh Excel Rapi</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPrint}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATS KPI CARDS OVERVIEW                             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[9px] text-slate-400 block font-semibold">Total Log</span>
          <span className="text-sm font-extrabold text-white font-mono">{summaryStats.total}</span>
        </div>
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[9px] text-emerald-400 block font-semibold">Hadir</span>
          <span className="text-sm font-extrabold text-emerald-400 font-mono">{summaryStats.hadir}</span>
        </div>
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[9px] text-cyan-400 block font-semibold">Izin / Sakit</span>
          <span className="text-sm font-extrabold text-cyan-400 font-mono">
            {summaryStats.izin + summaryStats.sakit}
          </span>
        </div>
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[9px] text-amber-400 block font-semibold">% Kehadiran</span>
          <span className="text-sm font-extrabold text-amber-400 font-mono">
            {summaryStats.attendancePercentage}%
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SWITCH VIEW: LOG JURNAL vs RINGKASAN PER SISWA        */}
      {/* ======================================================== */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1 gap-1 text-[11px] font-bold">
        <button
          onClick={() => {
            playTap();
            setActiveViewMode('journals');
          }}
          className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            activeViewMode === 'journals'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Log Jurnal &amp; Presensi ({filteredRecords.length})</span>
        </button>

        <button
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
        <div className="space-y-2.5">
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
                className={`p-3.5 rounded-2xl bg-slate-900 border transition-all space-y-2 shadow-sm ${
                  item.status === 'Hadir'
                    ? 'border-emerald-500/30'
                    : item.status === 'Belum Absen'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : item.status === 'Izin' || item.status === 'Sakit'
                    ? 'border-cyan-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Header: Date + Student Info + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {item.date}
                      </span>
                      <span className="text-xs font-bold text-white truncate uppercase">
                        {item.studentName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-bold text-cyan-400 bg-cyan-500/10 px-1 rounded uppercase">
                        {item.className}
                      </span>
                      {item.departmentName && item.departmentName !== '-' && (
                        <span className="text-indigo-300 font-semibold bg-indigo-500/10 px-1 rounded uppercase">
                          {item.departmentName}
                        </span>
                      )}
                      <span>&bull;</span>
                      <span className="text-slate-300 truncate max-w-[150px] uppercase">
                        {item.industryName}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 border ${
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
                </div>

                {/* Time & GPS Verification */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Jam Presensi: <strong className="text-white font-mono">{item.time} WIB</strong></span>
                  </span>

                  {item.status === 'Hadir' && (
                    <span className={item.verified ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      {item.verified ? '✓ Lokasi Terverifikasi DUDI' : '⚠️ Di Luar Radius'}
                    </span>
                  )}
                </div>

                {/* GPS Location details if present */}
                {item.locationName && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 uppercase truncate">
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{item.locationName}</span>
                  </p>
                )}

                {/* Narrative Journal Content Box */}
                {item.journal ? (
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/90 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-cyan-300">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-cyan-400" />
                        Jurnal Kegiatan Siswa:
                      </span>
                      <span className="text-slate-500 font-mono text-[9px]">
                        {item.journal.length} Karakter
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed uppercase whitespace-pre-wrap">
                      {item.journal}
                    </p>
                  </div>
                ) : item.notes && item.status !== 'Hadir' ? (
                  <div className="bg-cyan-950/30 p-2 rounded-xl border border-cyan-500/20 text-[10px] text-cyan-200">
                    <span className="font-bold">Keterangan: </span>
                    <span className="uppercase">{item.notes}</span>
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
        <div className="space-y-2.5">
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
            studentSummaries.map(({ student, totalDays, hadir, izin, sakit, belumAbsen, libur, rate, journalsCount }) => (
              <div
                key={student.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white uppercase truncate">{student.name}</h4>
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
    </div>
  );
};
