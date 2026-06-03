import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type ExportEventRow = {
  title: string;
  date: string;
  label: string;
  participantCount: number;
  description: string;
};

export type ExportStats = {
  totalEvents: number;
  totalParticipants: number;
  avgParticipants: number;
  typeDistribution: Record<string, number>;
  monthlyDistribution: Record<string, number>;
};

function toTrDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

function getMonthKey(date: string) {
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function calculateStats(rows: ExportEventRow[]): ExportStats {
  const totalEvents = rows.length;
  const totalParticipants = rows.reduce((sum, r) => sum + r.participantCount, 0);
  const avgParticipants = totalEvents > 0 ? Math.round(totalParticipants / totalEvents) : 0;

  const typeDistribution: Record<string, number> = {};
  const monthlyDistribution: Record<string, number> = {};

  rows.forEach((r) => {
    typeDistribution[r.label] = (typeDistribution[r.label] || 0) + 1;
    const monthKey = getMonthKey(r.date);
    monthlyDistribution[monthKey] = (monthlyDistribution[monthKey] || 0) + 1;
  });

  return {
    totalEvents,
    totalParticipants,
    avgParticipants,
    typeDistribution,
    monthlyDistribution,
  };
}

export async function exportEventsToExcel(filename: string, rows: ExportEventRow[]) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tuzla Belediyesi Afet İşleri';
    workbook.lastModifiedBy = 'Sistem';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ---------------------------------------------------------------------------
    // 1. Etkinlik Detayları Sayfası
    // ---------------------------------------------------------------------------
    const sheet = workbook.addWorksheet('Etkinlik Detayları', {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { defaultRowHeight: 25 }
    });

    sheet.columns = [
      { header: 'Başlık', key: 'title', width: 40 },
      { header: 'Tarih', key: 'date', width: 22 },
      { header: 'Etiket', key: 'label', width: 20 },
      { header: 'Katılımcı', key: 'participants', width: 15 },
      { header: 'Açıklama', key: 'description', width: 60 },
    ];

    // Stil: Başlık Satırı
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0B1120' } // Koyu lacivert
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12,
        name: 'Segoe UI'
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
    });

    // Verileri Ekleme ve Stil
    rows.forEach((r, index) => {
      const row = sheet.addRow({
        title: r.title || 'Başlıksız',
        date: toTrDateTime(r.date),
        label: r.label || '—',
        participants: Number.isFinite(Number(r.participantCount)) ? Number(r.participantCount) : 0,
        description: r.description || '',
      });

      // Alternatif satır renkleri
      const isEven = index % 2 === 0;
      const bgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Beyaz / Açık Gri

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.font = { size: 11, name: 'Segoe UI', color: { argb: 'FF0F172A' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 4 ? 'center' : 'left', // Katılımcı sayısı ortalı
          wrapText: colNumber === 5 // Açıklama wrap text
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // ---------------------------------------------------------------------------
    // 2. Özet İstatistikler Sayfası
    // ---------------------------------------------------------------------------
    if (rows && rows.length > 0) {
      const stats = calculateStats(rows);
      const summarySheet = workbook.addWorksheet('Özet İstatistikler', {
        properties: { defaultRowHeight: 22 }
      });

      summarySheet.columns = [
        { width: 35 },
        { width: 25 },
      ];

      // Ana Başlık
      summarySheet.mergeCells('A1:B1');
      const mainTitle = summarySheet.getCell('A1');
      mainTitle.value = 'Tuzla Belediyesi Afet İşleri Etkinlik Özeti';
      mainTitle.font = { bold: true, size: 16, color: { argb: 'FF0B1120' }, name: 'Segoe UI' };
      mainTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      summarySheet.getRow(1).height = 40;

      // Kategori Başlığı Fonksiyonu
      const addSectionHeader = (rowNum: number, text: string) => {
        summarySheet.mergeCells(`A${rowNum}:B${rowNum}`);
        const cell = summarySheet.getCell(`A${rowNum}`);
        cell.value = text;
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // Mavi
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        summarySheet.getRow(rowNum).height = 30;
      };

      // Satır Ekleme Fonksiyonu
      const addDataRow = (label: string, value: string | number) => {
        const row = summarySheet.addRow([label, value]);
        row.getCell(1).font = { bold: true, color: { argb: 'FF475569' } };
        row.getCell(2).font = { bold: false, color: { argb: 'FF0F172A' } };
        row.getCell(2).alignment = { horizontal: 'right' };
        row.eachCell((cell) => {
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        });
      };

      let currentRow = 3;

      // Genel İstatistikler
      addSectionHeader(currentRow++, 'Genel İstatistikler');
      addDataRow('Toplam Etkinlik Sayısı', stats.totalEvents);
      addDataRow('Toplam Katılımcı Sayısı', stats.totalParticipants);
      addDataRow('Ortalama Katılımcı', stats.avgParticipants);

      currentRow += 2;

      // Etiket Dağılımı
      addSectionHeader(currentRow++, 'Etiket Dağılımı');
      Object.entries(stats.typeDistribution)
        .sort((a, b) => b[1] - a[1]) // Çoktan aza sırala
        .forEach(([type, count]) => {
          addDataRow(type, count);
        });

      currentRow += 2;

      // Aylık Dağılım
      addSectionHeader(currentRow++, 'Aylık Dağılım');
      Object.entries(stats.monthlyDistribution)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, count]) => {
          addDataRow(month, count);
        });
    }

    // ---------------------------------------------------------------------------
    // Dosyayı İndirme
    // ---------------------------------------------------------------------------
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);

  } catch (error) {
    console.error('Excel export failed:', error);
    alert('Excel dosyası oluşturulurken bir hata oluştu.');
  }
}
