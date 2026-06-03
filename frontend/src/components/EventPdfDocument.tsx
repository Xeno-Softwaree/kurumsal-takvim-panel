import { Document, Font, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';
import { ExportEventRow } from '../export/eventsExport';

// Register Roboto font from CDN (no base64 to avoid DataView errors)
Font.register({
  family: 'Roboto',
  src: 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf',
});

Font.register({
  family: 'Roboto-Bold',
  src: 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf',
});

interface EventPdfDocumentProps {
  title: string;
  rows: ExportEventRow[];
}

function toTrDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

function calculateStats(rows: ExportEventRow[]) {
  const totalEvents = rows.length;
  const totalParticipants = rows.reduce((sum, r) => sum + r.participantCount, 0);
  const avgParticipants = totalEvents > 0 ? Math.round(totalParticipants / totalEvents) : 0;

  return { totalEvents, totalParticipants, avgParticipants };
}

export default function EventPdfDocument({ title, rows }: EventPdfDocumentProps) {
  const stats = calculateStats(rows);
  const reportDate = new Date().toLocaleDateString('tr-TR');
  const reportTime = new Date().toLocaleTimeString('tr-TR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Design */}
        <View style={styles.header}>
          {/* Decorative Header */}
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <Image src="/logo.png" style={styles.logoImage} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.mainTitle}>Tuzla Belediyesi</Text>
                <Text style={styles.subtitle}>Afet İşleri ve Risk Yönetimi</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.reportLabel}>ETKİNLİK RAPORU</Text>
            </View>
          </View>

          {/* Report Info */}
          <View style={styles.reportInfo}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Rapor Adı:</Text>
              <Text style={styles.infoValue}>{title || 'Genel Etkinlik Listesi'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tarih:</Text>
              <Text style={styles.infoValue}>{reportDate}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Saat:</Text>
              <Text style={styles.infoValue}>{reportTime}</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalEvents}</Text>
            <Text style={styles.statLabel}>Toplam Etkinlik</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalParticipants}</Text>
            <Text style={styles.statLabel}>Toplam Katılımcı</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.avgParticipants}</Text>
            <Text style={styles.statLabel}>Ortalama Katılımcı</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableContainer}>
          <Text style={styles.tableTitle}>Etkinlik Detayları</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.headerCell1}>
              <Text style={styles.headerText}>Başlık</Text>
            </View>
            <View style={styles.headerCell2}>
              <Text style={styles.headerText}>Tarih</Text>
            </View>
            <View style={styles.headerCell3}>
              <Text style={styles.headerText}>Etiket</Text>
            </View>
            <View style={styles.headerCell4}>
              <Text style={styles.headerText}>Katılımcı</Text>
            </View>
            <View style={styles.headerCell5}>
              <Text style={styles.headerText}>Açıklama</Text>
            </View>
          </View>

          {/* Table Rows */}
          {rows.map((row, index) => (
            <View key={index} style={styles.row}>
              <View style={styles.cell1}>
                <Text style={styles.cellText}>{row.title}</Text>
              </View>
              <View style={styles.cell2}>
                <Text style={styles.cellText}>{toTrDateTime(row.date)}</Text>
              </View>
              <View style={styles.cell3}>
                <View style={styles.tagContainer}>
                  <Text style={styles.tagText}>{row.label || 'Belirtilmemiş'}</Text>
                </View>
              </View>
              <View style={styles.cell4}>
                <Text style={styles.participantText}>
                  {Number.isFinite(Number(row.participantCount)) ? Number(row.participantCount) : 0}
                </Text>
              </View>
              <View style={styles.cell5}>
                <Text style={styles.cellText}>{row.description || '—'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>© 2024 Tuzla Belediyesi Afet İşleri</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerText}>Sayfa {1}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// PDF Download Link Component
interface EventPdfDownloadLinkProps {
  filename: string;
  title: string;
  rows: ExportEventRow[];
  children: React.ReactNode;
}

export function EventPdfDownloadLink({ filename, title, rows, children }: EventPdfDownloadLinkProps) {
  return (
    <PDFDownloadLink
      document={<EventPdfDocument title={title} rows={rows} />}
      fileName={filename}
      style={{ textDecoration: 'none' }}
    >
      {children}
    </PDFDownloadLink>
  );
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 10,
    padding: 20,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  header: {
    marginBottom: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    color: 'white',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoImage: {
    width: 36,
    height: 36,
    objectFit: 'contain',
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
    fontFamily: 'Roboto-Bold',
  },
  subtitle: {
    fontSize: 11,
    color: '#e0e7ff',
  },
  headerRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fbbf24',
    fontFamily: 'Roboto-Bold',
  },
  reportInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoItem: {
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Roboto-Bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 5,
    fontFamily: 'Roboto-Bold',
  },
  statLabel: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 15,
    fontFamily: 'Roboto-Bold',
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 1,
    backgroundColor: '#1e3a8a',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  headerCell1: {
    flex: 2,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#e0e7ff',
  },
  headerCell2: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#e0e7ff',
  },
  headerCell3: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#e0e7ff',
  },
  headerCell4: {
    flex: 0.8,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#e0e7ff',
  },
  headerCell5: {
    flex: 2,
    padding: 8,
  },
  headerText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 9,
    textAlign: 'left',
    fontFamily: 'Roboto-Bold',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cell1: {
    flex: 2,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
  },
  cell2: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
  },
  cell3: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
  },
  cell4: {
    flex: 0.8,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
    alignItems: 'center',
  },
  cell5: {
    flex: 2,
    padding: 8,
  },
  cellText: {
    fontSize: 9,
    textAlign: 'left',
    color: '#374151',
  },
  tagContainer: {
    backgroundColor: '#dbeafe',
    padding: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 8,
    color: '#1e40af',
    fontWeight: '600',
  },
  participantText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    fontFamily: 'Roboto-Bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
});
