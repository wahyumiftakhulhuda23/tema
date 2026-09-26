import { AttendanceRecord, INDONESIAN_DAYS, MONTH_NAMES_ID, Student, Industry } from '../types';

export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPastDaysDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getTodayDateString(d);
}

export function getFirstDayOfMonthDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const d = new Date(year, month, day);
  const dayName = INDONESIAN_DAYS[d.getDay()] || '';
  const monthName = MONTH_NAMES_ID[month] || '';
  return `${dayName}, ${day} ${monthName} ${year}`;
}

export function formatIndonesianDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const monthName = MONTH_NAMES_ID[month] || '';
  return `${day} ${monthName} ${year}`;
}

export function getDayNameFromDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return INDONESIAN_DAYS[d.getDay()] || '';
}

// Generates an array of dates in YYYY-MM-DD from startDate to endDate (inclusive)
export function getDateRangeArray(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  if (!startDate || !endDate) return dates;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return [startDate];
  }
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(getTodayDateString(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

// Calculate distance in meters between two lat/lng points using Haversine formula
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Export attendance & journal records to a beautifully styled, colored Excel spreadsheet (.xls / HTML-XML format)
export function exportToExcel(
  records: AttendanceRecord[],
  students: Student[],
  industries: Industry[],
  title: string = 'Rekapitulasi_Kehadiran_Jurnal_TeMa',
  dateRangeText?: string,
  schoolName: string = 'SMK Negeri 1',
  academicYear: string = '2025/2026'
) {
  const studentMap = new Map(students.map(s => [s.id, s]));
  const industryMap = new Map(industries.map(i => [i.id, i]));

  // Calculate statistics
  const total = records.length;
  const hadir = records.filter(r => r.status === 'Hadir').length;
  const izin = records.filter(r => r.status === 'Izin').length;
  const sakit = records.filter(r => r.status === 'Sakit').length;
  const libur = records.filter(r => r.status === 'Libur').length;
  const belum = records.filter(r => r.status === 'Belum Absen').length;
  const activeCount = total - libur;
  const rate = activeCount > 0 ? Math.round((hadir / activeCount) * 100) : 100;

  // Build styled HTML Spreadsheet
  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Rekap Presensi & Jurnal</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1E293B; }
      table { border-collapse: collapse; width: 100%; }
      .header-title { font-size: 16pt; font-weight: bold; color: #1E1B4B; text-align: center; }
      .header-sub { font-size: 12pt; font-weight: bold; color: #4338CA; text-align: center; }
      .header-meta { font-size: 10pt; color: #475569; text-align: center; }
      
      .kpi-title { font-weight: bold; background-color: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; padding: 6px; }
      .kpi-val { font-weight: bold; text-align: center; border: 1px solid #CBD5E1; padding: 6px; }
      .kpi-hadir { background-color: #DCFCE7; color: #15803D; }
      .kpi-izin { background-color: #DBEAFE; color: #1D4ED8; }
      .kpi-sakit { background-color: #FEF3C7; color: #B45309; }
      .kpi-belum { background-color: #FEE2E2; color: #B91C1C; }
      .kpi-libur { background-color: #F1F5F9; color: #64748B; }

      th { background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #0F172A; padding: 10px 8px; font-size: 10.5pt; }
      td { vertical-align: middle; border: 1px solid #CBD5E1; padding: 8px 6px; font-size: 10pt; mso-number-format:"\\@"; }
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      
      .row-even { background-color: #F8FAFC; }
      .row-odd { background-color: #FFFFFF; }

      /* Status Badge styling */
      .badge-hadir { background-color: #DCFCE7; color: #15803D; font-weight: bold; text-align: center; }
      .badge-izin { background-color: #DBEAFE; color: #1D4ED8; font-weight: bold; text-align: center; }
      .badge-sakit { background-color: #FEF3C7; color: #B45309; font-weight: bold; text-align: center; }
      .badge-libur { background-color: #E2E8F0; color: #475569; text-align: center; }
      .badge-belum { background-color: #FEE2E2; color: #B91C1C; font-weight: bold; text-align: center; }

      .journal-cell { white-space: normal; line-height: 1.4; font-style: normal; color: #0F172A; }
    </style>
  </head>
  <body>
    <table>
      <!-- School Header Banner -->
      <tr>
        <td colspan="12" class="header-title" style="border:none; padding: 4px;">${schoolName.toUpperCase()}</td>
      </tr>
      <tr>
        <td colspan="12" class="header-sub" style="border:none; padding: 4px;">LAPORAN REKAPITULASI PRESENSI & JURNAL KEGIATAN SISWA (TeMa)</td>
      </tr>
      <tr>
        <td colspan="12" class="header-meta" style="border:none; padding: 4px;">
          Tahun Ajaran: <strong>${academicYear}</strong> &nbsp;|&nbsp; 
          Periode Tanggal: <strong>${dateRangeText || formatIndonesianDate(getTodayDateString())}</strong> &nbsp;|&nbsp; 
          Diunduh pada: ${formatIndonesianDate(getTodayDateString())}
        </td>
      </tr>
      <tr><td colspan="12" style="border:none; height: 12px;"></td></tr>

      <!-- Summary KPI Block -->
      <tr>
        <td colspan="2" class="kpi-title text-center">TOTAL REKAP</td>
        <td colspan="2" class="kpi-title text-center">HADIR (V)</td>
        <td colspan="2" class="kpi-title text-center">IZIN (I)</td>
        <td colspan="2" class="kpi-title text-center">SAKIT (S)</td>
        <td colspan="2" class="kpi-title text-center">BELUM ABSEN / ALPA</td>
        <td colspan="2" class="kpi-title text-center">TINGKAT KEHADIRAN</td>
      </tr>
      <tr>
        <td colspan="2" class="kpi-val">${total} Data</td>
        <td colspan="2" class="kpi-val kpi-hadir">${hadir} Siswa</td>
        <td colspan="2" class="kpi-val kpi-izin">${izin} Siswa</td>
        <td colspan="2" class="kpi-val kpi-sakit">${sakit} Siswa</td>
        <td colspan="2" class="kpi-val kpi-belum">${belum} Siswa</td>
        <td colspan="2" class="kpi-val kpi-hadir" style="font-size: 13pt;">${rate}%</td>
      </tr>
      <tr><td colspan="12" style="border:none; height: 16px;"></td></tr>

      <!-- Data Table Header -->
      <thead>
        <tr>
          <th style="width: 45px;">NO</th>
          <th style="width: 100px;">TANGGAL</th>
          <th style="width: 80px;">HARI</th>
          <th style="width: 220px;">NAMA LENGKAP SISWA</th>
          <th style="width: 110px;">KELAS</th>
          <th style="width: 140px;">JURUSAN</th>
          <th style="width: 230px;">MITRA DUDI / INSTANSI</th>
          <th style="width: 120px;">STATUS</th>
          <th style="width: 85px;">JAM</th>
          <th style="width: 150px;">VERIFIKASI GPS</th>
          <th style="width: 450px;">DESKRIPSI JURNAL KEGIATAN</th>
          <th style="width: 200px;">KETERANGAN / CATATAN</th>
        </tr>
      </thead>
      <tbody>
  `;

  rowsHtml: {
    records.forEach((rec, index) => {
      const student = studentMap.get(rec.studentId);
      const industry = industryMap.get(rec.industryId);
      const day = getDayNameFromDate(rec.date);
      const className = student?.className || '-';
      const deptName = student?.departmentName || '-';
      const industryName = rec.industryName || student?.industryName || industry?.name || '-';
      
      let statusClass = 'badge-hadir';
      if (rec.status === 'Izin') statusClass = 'badge-izin';
      else if (rec.status === 'Sakit') statusClass = 'badge-sakit';
      else if (rec.status === 'Libur') statusClass = 'badge-libur';
      else if (rec.status === 'Belum Absen') statusClass = 'badge-belum';

      const verifiedText = rec.verified 
        ? '✓ Terverifikasi Sesuai Radius' 
        : (rec.latitude ? '⚠️ Di Luar Radius DUDI' : '-');

      const rowClass = index % 2 === 0 ? 'row-even' : 'row-odd';
      const cleanJournal = rec.journal && rec.journal !== '-' ? rec.journal : (rec.status === 'Hadir' ? 'Tidak ada catatan narasi' : '-');
      const cleanNotes = rec.notes || (rec.status === 'Libur' ? 'Hari Libur Kerja Industri' : '-');

      html += `
        <tr class="${rowClass}">
          <td class="text-center font-bold">${index + 1}</td>
          <td class="text-center">${rec.date}</td>
          <td class="text-center">${day}</td>
          <td class="text-left font-bold" style="color: #0F172A;">${(rec.studentName || student?.name || '-').toUpperCase()}</td>
          <td class="text-center font-bold" style="color: #0369A1;">${className.toUpperCase()}</td>
          <td class="text-center">${deptName.toUpperCase()}</td>
          <td class="text-left">${industryName.toUpperCase()}</td>
          <td class="${statusClass}">${rec.status.toUpperCase()}</td>
          <td class="text-center font-bold">${rec.time || '-'}</td>
          <td class="text-center" style="font-size: 9pt;">${verifiedText}</td>
          <td class="text-left journal-cell">${cleanJournal}</td>
          <td class="text-left" style="font-size: 9.5pt; color: #475569;">${cleanNotes}</td>
        </tr>
      `;
    });
  }

  html += `
      </tbody>
    </table>
    <br><br>
    <!-- Signatures section -->
    <table style="width: 100%; border: none;">
      <tr>
        <td colspan="4" style="border:none; text-align: left; font-size: 10pt;">
          Mengetahui,<br>
          <strong>Kepala Program Keahlian</strong>
          <br><br><br><br>
          ( .................................................... )<br>
          NIP. 
        </td>
        <td colspan="4" style="border:none;"></td>
        <td colspan="4" style="border:none; text-align: right; font-size: 10pt;">
          Ditetapkan pada: ${formatIndonesianDateShort(getTodayDateString())}<br>
          <strong>Guru Pembimbing Magang / TeFa</strong>
          <br><br><br><br>
          ( .................................................... )<br>
          NIP. 
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${title}_${getTodayDateString()}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
