import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useDbStore, QueryHistoryEntry } from '@/stores/dbStore';
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
  const toggleFavoriteHistory = useDbStore((s) => s.toggleFavoriteHistory);

  const [filter, setFilter] = React.useState<'all' | 'favorites'>('all');

  const filtered = React.useMemo(() => {
    const byConnection = queryHistory.filter((h) => h.connectionId === connectionId);
    if (filter === 'favorites') {
      return byConnection.filter((h) => h.isFavorite);
    }
    return byConnection;
  }, [queryHistory, connectionId, filter]);

  const favoritesCount = React.useMemo(
    () => queryHistory.filter((h) => h.connectionId === connectionId && h.isFavorite).length,
    [queryHistory, connectionId]
  );

  const handleClear = () => {
    Alert.alert(t('db.history'), t('common.clear') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          Haptic.warning();
          clearHistory();
        },
      },
    ]);
  };

  const handleTap = (entry: QueryHistoryEntry) => {
    Haptic.selection();
    onSelectQuery(entry.query);
  };

  const handleToggleFavorite = (id: string) => {
    Haptic.light();
    toggleFavoriteHistory(id);
  };

  const handleRemoveEntry = (id: string) => {
    Haptic.warning();
    removeHistoryEntry(id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
        <Text style={[styles.title, { color: theme.textLabel }]}>{t('db.history')}</Text>
        <View style={styles.filterRow}>
          <RipplePressable onPress={() => setFilter('all')} haptic="light">
            <View style={[
              styles.filterChip,
              { backgroundColor: filter === 'all' ? theme.accentLight : 'transparent' },
            ]}>
              <Text style={[styles.filterText, { color: filter === 'all' ? theme.accent : theme.textMuted }]}>
                All
              </Text>
            </View>
          </RipplePressable>
          <RipplePressable onPress={() => setFilter('favorites')} haptic="light">
            <View style={[
              styles.filterChip,
              { backgroundColor: filter === 'favorites' ? theme.accentLight : 'transparent' },
            ]}>
              <Ionicons
                name="star"
                size={10}
                color={filter === 'favorites' ? theme.accent : theme.textMuted}
                style={{ marginRight: 2 }}
              />
              <Text style={[styles.filterText, { color: filter === 'favorites' ? theme.accent : theme.textMuted }]}>
                {favoritesCount}
              </Text>
            </View>
          </RipplePressable>
        </View>
        {filtered.length > 0 && (
          <RipplePressable onPress={handleClear} haptic="light">
            <Text style={[styles.clearText, { color: theme.danger }]}>{t('common.clear')}</Text>
          </RipplePressable>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={28} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {filter === 'favorites' ? 'No favorite queries' : t('db.noHistory')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <RipplePressable onPress={() => handleTap(item)} haptic="selection">
              <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.queryText, { color: theme.text }]} numberOfLines={3}>
                    {item.query}
                  </Text>
                  <RipplePressable onPress={() => handleToggleFavorite(item.id)} haptic="light">
                    <Ionicons
                      name={item.isFavorite ? 'star' : 'star-outline'}
                      size={14}
                      color={item.isFavorite ? '#f0c040' : theme.textMuted}
                    />
                  </RipplePressable>
                </View>
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
                  <View style={{ flex: 1 }} />
                  <RipplePressable onPress={() => handleRemoveEntry(item.id)} haptic="light">
                    <Ionicons name="close-circle-outline" size={12} color={theme.textMuted} />
                  </RipplePressable>
                </View>
              </View>
            </RipplePressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: SPACING.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  title: { ...TYPOGRAPHY.label },
  filterRow: { flexDirection: 'row', gap: SPACING.xs },
  filterChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: { ...TYPOGRAPHY.monoSm, fontSize: 10 },
  clearText: { ...TYPOGRAPHY.caption, color: '#e74c3c' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyText: { ...TYPOGRAPHY.caption },
  listContent: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  card: {
    width: 260,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  queryText: {
    ...TYPOGRAPHY.mono,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    marginRight: SPACING.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: { ...TYPOGRAPHY.monoSm, fontSize: 10 },
  duration: { ...TYPOGRAPHY.monoSm, fontSize: 10, fontWeight: '600' },
});
