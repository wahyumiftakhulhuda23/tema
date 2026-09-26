import React, { useMemo } from 'react';
import { useTeMa } from '../context/TeMaContext';
import {
  formatIndonesianDate,
  formatIndonesianDateShort,
  getDateRangeArray,
  exportToExcel,
  getTodayDateString
} from '../utils/helpers';
import { Printer, Download, X, FileText } from 'lucide-react';
import { playTap, playSuccess } from '../utils/sound';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filterParams: {
    startDate?: string;
    endDate?: string;
    date?: string;
    classId: string;
    industryId: string;
    departmentId?: string;
  };
}

export const PrintReportModal: React.FC<Props> = ({ isOpen, onClose, filterParams }) => {
  const { state, getStudentTodayStatus } = useTeMa();

  const startDate = filterParams.startDate || filterParams.date || getTodayDateString();
  const endDate = filterParams.endDate || filterParams.date || getTodayDateString();

  const dateList = useMemo(() => {
    return getDateRangeArray(startDate, endDate);
  }, [startDate, endDate]);

  const reportData = useMemo(() => {
    const recordsList: Array<{
      id: string;
      date: string;
      studentId: string;
      studentName: string;
      className: string;
      departmentName: string;
      industryName: string;
      status: string;
      time: string;
      journal: string;
      notes: string;
      verified: boolean;
    }> = [];

    const targetStudents = (state.students || []).filter(student => {
      const matchDept =
        !filterParams.departmentId ||
        filterParams.departmentId === 'all' ||
        student.departmentId === filterParams.departmentId ||
        (student.departmentName && student.departmentName.toLowerCase().includes((filterParams.departmentId || '').toLowerCase()));

      const matchIndustry =
        !filterParams.industryId ||
        filterParams.industryId === 'all' ||
        student.industryId === filterParams.industryId;

      return matchDept && matchIndustry;
    });

    dateList.forEach(targetDate => {
      targetStudents.forEach(student => {
        const statusInfo = getStudentTodayStatus(student.id, targetDate);
        const record = statusInfo.record;

        recordsList.push({
          id: record ? record.id : `print-${student.id}-${targetDate}`,
          date: targetDate,
          studentId: student.id,
          studentName: student.name,
          className: student.className || '-',
          departmentName: student.departmentName || '-',
          industryName: student.industryName || statusInfo.industry?.name || '-',
          status: statusInfo.status,
          time: record?.time || '-',
          journal: record?.journal || '',
          notes: record?.notes || statusInfo.reason || (statusInfo.status === 'Libur' ? 'Libur Industri' : '-'),
          verified: record?.verified ?? false,
        });
      });
    });

    // Sort descending by date, then ascending by student name
    return recordsList.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [state.students, filterParams, getStudentTodayStatus, dateList]);

  const stats = useMemo(() => {
    const total = reportData.length;
    const hadir = reportData.filter(d => d.status === 'Hadir').length;
    const izin = reportData.filter(d => d.status === 'Izin').length;
    const sakit = reportData.filter(d => d.status === 'Sakit').length;
    const belumAbsen = reportData.filter(d => d.status === 'Belum Absen').length;
    const libur = reportData.filter(d => d.status === 'Libur').length;
    const activeRequired = total - libur;
    const rate = activeRequired > 0 ? Math.round((hadir / activeRequired) * 100) : 100;

    return { total, hadir, izin, sakit, belumAbsen, libur, rate };
  }, [reportData]);

  if (!isOpen) return null;

  const handlePrint = () => {
    playSuccess();
    window.print();
  };

  const handleExcelExport = () => {
    playTap();
    const exportRecords = reportData.map(item => ({
      id: item.id,
      studentId: item.studentId,
      studentName: item.studentName,
      industryId: '',
      industryName: item.industryName,
      departmentName: item.departmentName,
      date: item.date,
      time: item.time,
      status: item.status as any,
      notes: item.notes,
      journal: item.journal || '-',
      verified: item.verified,
      createdAt: new Date().toISOString(),
    }));

    const dateRangeLabel = startDate === endDate
      ? formatIndonesianDate(startDate)
      : `${formatIndonesianDateShort(startDate)} s/d ${formatIndonesianDateShort(endDate)}`;

    exportToExcel(
      exportRecords,
      state.students,
      state.industries,
      `Laporan_Kehadiran_TeMa_${startDate}_sd_${endDate}`,
      dateRangeLabel,
      state.appSettings.schoolName,
      state.appSettings.academicYear
    );
    playSuccess();
  };

  const dateRangeTitle = startDate === endDate
    ? formatIndonesianDate(startDate)
    : `${formatIndonesianDateShort(startDate)} s/d ${formatIndonesianDateShort(endDate)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 text-slate-900">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Action Header */}
        <div className="p-3 bg-slate-950 text-white flex items-center justify-between no-print shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-bold tracking-wide">
              Pratinjau Cetak Laporan Administrasi Presensi &amp; Jurnal TeMa
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Simpan PDF
            </button>
            <button
              onClick={handleExcelExport}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Excel Rapi
            </button>
            <button
              onClick={() => {
                playTap();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Sheet View */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-950/80 flex-1">
          <div className="print-sheet max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-xl text-slate-900">
            {/* Kop Surat Resmi */}
            <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
              <h4 className="text-xs font-bold tracking-wider uppercase text-slate-700">
                DINAS PENDIDIKAN &amp; KEBUDAYAAN &bull; BIDANG PENDIDIKAN VOKASI
              </h4>
              <h2 className="text-base font-extrabold uppercase text-slate-950 mt-0.5">
                {state.appSettings.schoolName || 'SMK NEGERI 1 INFORMATIKA & VOKASI'}
              </h2>
              <p className="text-[11px] text-slate-600">
                Sistem Informasi Terpadu Magang Industri &amp; Teaching Factory (TeMa)
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Tahun Ajaran {state.appSettings.academicYear || '2025/2026'} &bull; Periode Presensi &amp; Jurnal:{' '}
                <strong>{dateRangeTitle}</strong>
              </p>
            </div>

            {/* Document Title */}
            <div className="text-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-tight text-indigo-950">
                REKAPITULASI PRESENSI &amp; JURNAL KEGIATAN SISWA
              </h3>
            </div>

            {/* Statistics KPI */}
            <div className="grid grid-cols-5 gap-1.5 mb-4 text-center">
              <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                <span className="text-[9px] text-slate-500 font-medium block">Total Log</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{stats.total}</span>
              </div>
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-300">
                <span className="text-[9px] text-emerald-800 font-medium block">Hadir</span>
                <span className="text-sm font-bold text-emerald-800 font-mono">{stats.hadir}</span>
              </div>
              <div className="p-2 bg-blue-50 rounded-xl border border-blue-300">
                <span className="text-[9px] text-blue-800 font-medium block">Izin</span>
                <span className="text-sm font-bold text-blue-800 font-mono">{stats.izin}</span>
              </div>
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-300">
                <span className="text-[9px] text-amber-800 font-medium block">Sakit</span>
                <span className="text-sm font-bold text-amber-800 font-mono">{stats.sakit}</span>
              </div>
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-300">
                <span className="text-[9px] text-rose-800 font-medium block">Belum Absen</span>
                <span className="text-sm font-bold text-rose-800 font-mono">{stats.belumAbsen}</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-300 mb-6">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="p-2 w-7 text-center">No</th>
                    <th className="p-2 w-20 text-center">Tanggal</th>
                    <th className="p-2">Nama Siswa</th>
                    <th className="p-2">Kelas / Jurusan</th>
                    <th className="p-2">Mitra DUDI</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-center">Waktu</th>
                    <th className="p-2">Narasi Jurnal Kegiatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-slate-500 italic">
                        Tidak ada data yang tersedia untuk rentang tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2 text-center font-mono text-slate-700">{item.date}</td>
                        <td className="p-2">
                          <span className="font-bold text-slate-900 block uppercase">{item.studentName}</span>
                        </td>
                        <td className="p-2 font-medium text-slate-700">
                          <span className="font-bold text-cyan-800 uppercase block">{item.className}</span>
                          <span className="text-[9px] text-slate-500 uppercase">{item.departmentName}</span>
                        </td>
                        <td className="p-2 text-slate-700 max-w-[140px] uppercase truncate">
                          {item.industryName}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                              item.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-400'
                                : item.status === 'Libur'
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : item.status === 'Izin' || item.status === 'Sakit'
                                ? 'bg-blue-100 text-blue-800 border border-blue-400'
                                : 'bg-rose-100 text-rose-800 border border-rose-400'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-2 text-center font-mono text-slate-700">
                          {item.time !== '-' ? `${item.time} WIB` : '-'}
                        </td>
                        <td className="p-2 max-w-[240px]">
                          {item.journal ? (
                            <p className="text-slate-800 leading-tight uppercase line-clamp-3">
                              {item.journal}
                            </p>
                          ) : item.status === 'Libur' ? (
                            <span className="text-slate-400 italic">Jadwal Libur Industri</span>
                          ) : (
                            <span className="text-slate-400 italic">{item.notes || '-'}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 text-[11px] pt-4 text-center">
              <div>
                <p className="text-slate-600 mb-14">
                  Mengetahui,<br />
                  <strong>Pembimbing / Pimpinan DUDI</strong>
                </p>
                <p className="font-bold underline text-slate-900">( ........................................ )</p>
                <p className="text-slate-500 text-[10px]">NIP / ID Industri</p>
              </div>

              <div>
                <p className="text-slate-600 mb-14">
                  Ditetapkan pada: {formatIndonesianDate(getTodayDateString())}<br />
                  <strong>Guru Pembimbing Magang / TeFa</strong>
                </p>
                <p className="font-bold underline text-slate-900">( ........................................ )</p>
                <p className="text-slate-500 text-[10px]">NIP. Guru Pembimbing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
