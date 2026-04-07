import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page:       { padding: 40, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  logo:       { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  logoSub:    { fontSize: 9, color: '#9ca3af', marginTop: 2 },
  title:      { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  subtitle:   { fontSize: 11, color: '#6b7280' },
  section:    { marginBottom: 20 },
  sectionHdr: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 10, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  row:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label:      { fontSize: 9, color: '#6b7280' },
  value:      { fontSize: 9, color: '#111827', fontFamily: 'Helvetica-Bold' },
  compCard:   { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 10, marginBottom: 8 },
  compName:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 3 },
  compMeta:   { fontSize: 8, color: '#6b7280', marginBottom: 6 },
  barBg:      { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2 },
  barFill:    { height: 4, borderRadius: 2 },
  scoreText:  { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  flagRow:    { flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'flex-start' },
  flagDot:    { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  flagText:   { fontSize: 9, color: '#374151', flex: 1 },
  footer:     { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#9ca3af' },
  twoCol:     { flexDirection: 'row', gap: 12 },
  col:        { flex: 1 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compCardSm: { width: '47%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 8 },
});

const LEVEL_COLOR = {
  high:   { bar: '#10b981', text: '#065f46', badge: '#d1fae5' },
  medium: { bar: '#f59e0b', text: '#92400e', badge: '#fef3c7' },
  low:    { bar: '#ef4444', text: '#991b1b', badge: '#fee2e2' },
};

const FLAG_COLOR: Record<string, string> = {
  INFO: '#9ca3af', WARNING: '#f59e0b', CRITICAL: '#ef4444',
};

const COMP_LABELS: Record<string, string> = {
  sales_skills: 'Навыки продаж', stress_resistance: 'Стрессоустойч.',
  communication_flexibility: 'Гибкость общения', motivation: 'Мотивация',
  honesty: 'Честность', emotional_intelligence: 'Эмоц. интеллект',
  locus_of_control: 'Локус контроля', attention: 'Внимательность',
  leadership: 'Лидерство', systems_thinking: 'Системное мышл.',
  negotiation: 'Переговоры', result_orientation: 'Ориент. на результат',
  service_orientation: 'Клиентоориент.', monotolerance: 'Моноустойчивость',
  attention_to_detail: 'Внимат. к деталям', self_motivation: 'Самомотивация',
};

const WEIGHT_LABEL: Record<number, string> = { 3: 'Обязательная', 2: 'Важная', 1: 'Доп.' };

interface Props {
  data: {
    candidateName: string;
    position: { name: string; industry: string };
    testSession: { language: string; startedAt: string; finishedAt: string; tabSwitches: number } | null;
    competencyResults: { competency: string; score: number; level: string; weight: number }[];
    riskFlags: { level: string; type: string; descriptionRu: string }[];
  };
}

export default function ReportPdf({ data }: Props) {
  const date = new Date().toLocaleDateString('ru-RU');
  const duration = data.testSession?.startedAt && data.testSession?.finishedAt
    ? `${Math.floor((new Date(data.testSession.finishedAt).getTime() - new Date(data.testSession.startedAt).getTime()) / 60000)} мин`
    : '—';

  const avgScore = data.competencyResults.length > 0
    ? Math.round(data.competencyResults.reduce((s, r) => s + r.score, 0) / data.competencyResults.length)
    : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Aptio</Text>
            <Text style={styles.logoSub}>HR Assessment Report</Text>
          </View>
          <Text style={styles.footerText}>Создан {date}</Text>
        </View>

        {/* Candidate */}
        <View style={styles.section}>
          <Text style={styles.title}>{data.candidateName}</Text>
          <Text style={styles.subtitle}>{data.position.name} · {data.position.industry}</Text>
        </View>

        {/* Summary */}
        <View style={[styles.section, styles.twoCol]}>
          <View style={[styles.col, { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 12 }]}>
            <Text style={styles.sectionHdr}>Сводка</Text>
            {[
              ['Дата', data.testSession?.finishedAt ? new Date(data.testSession.finishedAt).toLocaleDateString('ru-RU') : '—'],
              ['Длительность', duration],
              ['Язык', { ru: 'Русский', uz: "O'zbek", en: 'English' }[data.testSession?.language ?? ''] ?? '—'],
              ['Средний балл', `${avgScore}%`],
              ['Переключений вкладок', String(data.testSession?.tabSwitches ?? 0)],
            ].map(([l, v]) => (
              <View key={l} style={styles.row}>
                <Text style={styles.label}>{l}</Text>
                <Text style={styles.value}>{v}</Text>
              </View>
            ))}
          </View>

          {/* Risk flags */}
          <View style={[styles.col, { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 12 }]}>
            <Text style={styles.sectionHdr}>Флаги риска ({data.riskFlags.length})</Text>
            {data.riskFlags.length === 0
              ? <Text style={{ fontSize: 9, color: '#9ca3af' }}>Флагов не обнаружено</Text>
              : data.riskFlags.map((f, i) => (
                  <View key={i} style={styles.flagRow}>
                    <View style={[styles.flagDot, { backgroundColor: FLAG_COLOR[f.level] ?? '#9ca3af' }]} />
                    <Text style={styles.flagText}>{f.descriptionRu}</Text>
                  </View>
                ))
            }
          </View>
        </View>

        {/* Competency results grid */}
        <View style={styles.section}>
          <Text style={styles.sectionHdr}>Компетенции ({data.competencyResults.length})</Text>
          <View style={styles.grid}>
            {data.competencyResults.map((r) => {
              const lc = LEVEL_COLOR[r.level as keyof typeof LEVEL_COLOR] ?? LEVEL_COLOR.low;
              return (
                <View key={r.competency} style={styles.compCardSm}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.compName, { flex: 1, fontSize: 9 }]}>{COMP_LABELS[r.competency] ?? r.competency}</Text>
                    <Text style={[styles.scoreText, { fontSize: 12, color: lc.text }]}>{r.score}%</Text>
                  </View>
                  <Text style={[styles.compMeta, { marginBottom: 4 }]}>{WEIGHT_LABEL[r.weight] ?? '—'}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${r.score}%`, backgroundColor: lc.bar }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Aptio HR Platform · Конфиденциально</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
