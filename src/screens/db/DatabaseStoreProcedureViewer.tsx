import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { DbConnection } from '@/stores/dbStore';

interface Props {
  connection: DbConnection;
}

interface StoredProcedure {
  name: string;
  schema: string;
  language: string;
  params: string;
  definer: string;
  created: string;
}

const MOCK_PROCEDURES: Record<string, StoredProcedure[]> = {
  mysql: [
    { name: 'sp_get_user_orders', schema: 'public', language: 'SQL', params: 'IN user_id INT, IN limit INT', definer: 'admin@%', created: '2025-05-12' },
    { name: 'sp_update_inventory', schema: 'public', language: 'SQL', params: 'IN product_id INT, IN qty INT', definer: 'admin@%', created: '2025-05-20' },
    { name: 'sp_calculate_revenue', schema: 'analytics', language: 'SQL', params: 'IN start_date DATE, IN end_date DATE', definer: 'root@localhost', created: '2025-06-01' },
  ],
  postgresql: [
    { name: 'fn_audit_log', schema: 'public', language: 'plpgsql', params: 'IN table_name TEXT', definer: 'postgres', created: '2025-04-10' },
    { name: 'fn_cleanup_sessions', schema: 'public', language: 'plpgsql', params: '', definer: 'postgres', created: '2025-05-01' },
  ],
  questdb: [
    { name: 'rebalance_partitions', schema: 'public', language: 'SQL', params: '', definer: 'admin', created: '2025-06-08' },
  ],
  sqlite: [],
};

export default function DatabaseStoreProcedureViewer({ connection }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading] = React.useState(false);
  const procedures = MOCK_PROCEDURES[connection.type] || [];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={theme.accent} />
      </View>
    );
  }

  if (procedures.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="code-slash-outline" size={28} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('db.noProcedures')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={procedures}
        keyExtractor={(item) => item.name}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
            <View style={styles.cardHeader}>
              <Ionicons name="code-slash" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            </View>
            <View style={styles.cardMeta}>
              <View style={[styles.chip, { backgroundColor: theme.bgInput }]}>
                <Ionicons name="layers-outline" size={9} color={theme.textMuted} style={{ marginRight: 3 }} />
                <Text style={[styles.chipText, { color: theme.textMuted }]}>{item.schema}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: theme.bgInput }]}>
                <Ionicons name="code-outline" size={9} color={theme.textMuted} style={{ marginRight: 3 }} />
                <Text style={[styles.chipText, { color: theme.textMuted }]}>{item.language}</Text>
              </View>
            </View>
            {item.params ? (
              <Text style={[styles.params, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.params}
              </Text>
            ) : null}
            <View style={styles.cardFooter}>
              <Ionicons name="person-outline" size={10} color={theme.textMuted} style={{ marginRight: 3 }} />
              <Text style={[styles.footerText, { color: theme.textMuted }]}>{item.definer}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: SPACING.sm },
  listContent: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  center: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.xl, gap: SPACING.sm,
  },
  emptyText: { ...TYPOGRAPHY.caption },
  card: {
    width: 200, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm,
  },
  cardName: { ...TYPOGRAPHY.bodyBold, flex: 1 },
  cardMeta: {
    flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  chipText: { ...TYPOGRAPHY.monoSm, fontSize: 10 },
  params: { ...TYPOGRAPHY.mono, fontSize: 11, marginBottom: SPACING.sm, lineHeight: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  footerText: { ...TYPOGRAPHY.monoSm, fontSize: 10 },
});
