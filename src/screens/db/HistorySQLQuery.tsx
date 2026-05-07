import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useDbStore, QueryHistoryEntry, DbConnection } from '@/stores/dbStore';
import { Haptic } from '@/utils/haptics';
import RipplePressable from '@/components/RipplePressable';

interface Props {
  connectionId: string;
  onSelectQuery: (query: string) => void;
}

export default function HistorySQLQuery({ connectionId, onSelectQuery }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryHistory = useDbStore((s) => s.queryHistory);
  const clearHistory = useDbStore((s) => s.clearHistory);
  const removeHistoryEntry = useDbStore((s) => s.removeHistoryEntry);

  const filtered = React.useMemo(
    () => queryHistory.filter((h) => h.connectionId === connectionId),
    [queryHistory, connectionId]
  );

  const handleClear = () => {
    Alert.alert(t('db.history'), t('common.clear') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: () => {
        Haptic.warning();
        clearHistory();
      }},
    ]);
  };

  const handleTap = (entry: QueryHistoryEntry) => {
    Haptic.selection();
    onSelectQuery(entry.query);
  };

  if (filtered.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="time-outline" size={32} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('db.noHistory')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
        <Text style={[styles.title, { color: theme.textLabel }]}>{t('db.history')}</Text>
        <View style={{ flex: 1 }} />
        <RipplePressable onPress={handleClear} haptic="light">
          <Text style={[styles.clearText, { color: theme.danger }]}>{t('common.clear')}</Text>
        </RipplePressable>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <RipplePressable onPress={() => handleTap(item)} haptic="selection">
            <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
              <Text style={[styles.queryText, { color: theme.text }]} numberOfLines={3}>
                {item.query}
              </Text>
              <View style={styles.cardMeta}>
                <Ionicons name="server-outline" size={10} color={theme.textMuted} style={{ marginRight: 3 }} />
                <Text style={[styles.metaText, { color: theme.textMuted }]} numberOfLines={1}>
                  {item.connectionName}
                </Text>
                {item.duration !== undefined && (
                  <Text style={[styles.duration, { color: theme.accent }]}>
                    {'  '}{item.duration}ms
                  </Text>
                )}
              </View>
            </View>
          </RipplePressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: SPACING.sm },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  title: { ...TYPOGRAPHY.label },
  clearText: { ...TYPOGRAPHY.caption, color: '#e74c3c' },
  empty: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.xl, gap: SPACING.sm,
  },
  emptyText: { ...TYPOGRAPHY.caption },
  listContent: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  card: {
    width: 240, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md,
  },
  queryText: {
    ...TYPOGRAPHY.mono, fontSize: 12, lineHeight: 17,
    marginBottom: SPACING.sm,
  },
  cardMeta: {
    flexDirection: 'row', alignItems: 'center',
  },
  metaText: { ...TYPOGRAPHY.monoSm, fontSize: 10 },
  duration: { ...TYPOGRAPHY.monoSm, fontSize: 10, fontWeight: '600' },
});
