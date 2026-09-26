import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatIndonesianDate, formatIndonesianDateShort, getTodayDateString } from './helpers';

interface ReportItem {
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
}

interface ExportPDFParams {
  reportData: ReportItem[];
  schoolName: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  stats: {
    total: number;
    hadir: number;
    izin: number;
    sakit: number;
    belumAbsen: number;
    libur: number;
    rate: number;
  };
}

export function exportToPDF({
  reportData,
  schoolName,
  academicYear,
  startDate,
  endDate,
  stats,
}: ExportPDFParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const dateRangeLabel =
    startDate === endDate
      ? formatIndonesianDate(startDate)
      : `${formatIndonesianDateShort(startDate)} s/d ${formatIndonesianDateShort(endDate)}`;

  // Header / Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('DINAS PENDIDIKAN & KEBUDAYAAN • BIDANG PENDIDIKAN VOKASI', pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text((schoolName || 'SMK NEGERI 1 INFORMATIKA & VOKASI').toUpperCase(), pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Sistem Informasi Terpadu Magang Industri & Teaching Factory (TeMa)', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(8.5);
  doc.text(`Tahun Ajaran ${academicYear || '2025/2026'} | Periode: ${dateRangeLabel}`, pageWidth / 2, 29.5, { align: 'center' });

  // Divider line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(14, 32, pageWidth - 14, 32);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('REKAPITULASI PRESENSI & JURNAL KEGIATAN SISWA', pageWidth / 2, 38, { align: 'center' });

  // Summary Metrics Bar
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 42, pageWidth - 28, 11, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const summaryText = `Total: ${stats.total} | Hadir: ${stats.hadir} (${stats.rate}%) | Izin: ${stats.izin} | Sakit: ${stats.sakit} | Alpa/Belum: ${stats.belumAbsen} | Libur: ${stats.libur}`;
  doc.text(summaryText, pageWidth / 2, 48.5, { align: 'center' });

  // Table Body Rows
  const tableRows = reportData.map((item, index) => {
    let narrative = item.journal || item.notes || '-';
    if (item.status === 'Libur') narrative = 'Jadwal Libur Industri';

    return [
      (index + 1).toString(),
      item.date,
      item.studentName.toUpperCase(),
      `${item.className}\n${item.departmentName}`,
      item.industryName.toUpperCase(),
      item.status,
      item.time !== '-' ? `${item.time} WIB` : '-',
      narrative.toUpperCase(),
    ];
  });

  autoTable(doc, {
    startY: 56,
    head: [['No', 'Tanggal', 'Nama Siswa', 'Kelas / Jurusan', 'Mitra DUDI', 'Status', 'Waktu', 'Jurnal Kegiatan']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 28 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = data.cell.raw as string;
        if (val === 'Hadir') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Izin' || val === 'Sakit') {
          data.cell.styles.textColor = [30, 64, 175];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Belum Absen') {
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 42 },
  });

  // Signature section at the end
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();

  // If signatures would overflow page, add new page
  if (finalY + 32 > pageHeight) {
    doc.addPage();
  }

  const sigY = finalY + 32 > pageHeight ? 20 : finalY;

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  // Left signature: DUDI
  doc.text('Mengetahui,', 40, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Pembimbing / Pimpinan DUDI', 40, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('( .................................................... )', 40, sigY + 22, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text('NIP / ID Industri', 40, sigY + 26, { align: 'center' });

  // Right signature: Guru
  doc.setFontSize(8.5);
  doc.text(`Ditetapkan: ${formatIndonesianDate(getTodayDateString())}`, pageWidth - 40, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Guru Pembimbing Magang / TeFa', pageWidth - 40, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('( .................................................... )', pageWidth - 40, sigY + 22, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text('NIP. Guru Pembimbing', pageWidth - 40, sigY + 26, { align: 'center' });

  // Save the PDF file
  const fileName = `Laporan_Presensi_TeMa_${startDate}_sd_${endDate}.pdf`;
  doc.save(fileName);
}
