import React from 'react';

interface EventPrintTemplateProps {
  title: string;
  children: React.ReactNode;
}

export default function EventPrintTemplate({ title, children }: EventPrintTemplateProps) {
  return (
    <div className="print-container">
      <style>{`
        @media print {
          @page {
            margin: 20mm;
            size: A4;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 0;
          }
          .print-container {
            max-width: none;
            width: 100%;
          }
          .print-header {
            text-align: center;
            margin-bottom: 30pt;
            page-break-after: avoid;
          }
          .print-title {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 10pt;
            color: #000000;
          }
          .print-subtitle {
            font-size: 12pt;
            color: #0066cc;
            margin-bottom: 15pt;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20pt;
            page-break-inside: auto;
          }
          .print-table th {
            background-color: #003366;
            color: #ffffff;
            padding: 8pt;
            text-align: left;
            font-weight: bold;
            border: 1px solid #003366;
          }
          .print-table td {
            padding: 8pt;
            border: 1px solid #cccccc;
            vertical-align: top;
          }
          .print-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .no-print {
            display: none !important;
          }
          .description-cell {
            max-width: 300px;
            word-wrap: break-word;
            white-space: pre-wrap;
          }
        }
        @media screen {
          .print-container {
            display: none;
          }
        }
      `}</style>
      
      <div className="print-header">
        <div className="print-title">Tuzla Belediyesi Afet İşleri ve Risk Yönetimi Etkinlik Raporu</div>
        <div className="print-subtitle">bilgi@tuzlaafad.com</div>
        {title && <div style={{ fontSize: '14pt', marginBottom: '20pt', fontWeight: '600' }}>{title}</div>}
      </div>
      
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Başlık</th>
            <th style={{ width: '15%' }}>Tarih</th>
            <th style={{ width: '12%' }}>Etiket</th>
            <th style={{ width: '8%' }}>Katılımcı</th>
            <th style={{ width: '35%' }}>Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}
