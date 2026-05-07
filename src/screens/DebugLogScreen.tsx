import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Logger, LogEntry, LogLevel, LogStats } from '@/utils/logger';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/theme/ThemeContext';

interface Props {
  onClose: () => void;
}

const LEVEL_CONFIG: Record<string, { color: string; label: string }> = {
  DEBUG: { color: '#8888cc', label: 'DEBUG' },
  INFO: { color: '#27ae60', label: 'INFO' },
  WARN: { color: '#FF9900', label: 'WARN' },
  ERROR: { color: '#e74c3c', label: 'ERROR' },
};

const LOG_LEVELS: LogLevel[] = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];

export default function DebugLogScreen({ onClose }: Props) {
  const theme = useTheme();
  const [entries, setEntries] = React.useState<LogEntry[]>([]);
  const [filter, setFilter] = React.useState('');
  const [showLevel, setShowLevel] = React.useState<LogLevel>(LogLevel.INFO);
  const [stats, setStats] = React.useState<LogStats | null>(null);
  const [showStats, setShowStats] = React.useState(false);
  const [newestFirst, setNewestFirst] = React.useState(true);

  React.useEffect(() => {
    const refresh = () => {
      setEntries(Logger.getEntries());
      setStats(Logger.getStats());
    };
    refresh();
    const unsub = Logger.subscribe(refresh);
    return unsub;
  }, []);

  const filtered = React.useMemo(() => {
    let list = entries.filter((e) => {
      if (e.level < showLevel) return false;
      if (filter && !e.message.toLowerCase().includes(filter.toLowerCase()) && !e.tag.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
    if (newestFirst) {
      return [...list].reverse();
    }
    return list;
  }, [entries, showLevel, filter, newestFirst]);

  const currentLevelConfig = LOG_LEVELS.find((l) => l === showLevel) ?? LOG_LEVELS[1];
  const levelLabel = showLevel === LogLevel.DEBUG ? 'ALL' : LEVEL_CONFIG[LogLevel[showLevel]]?.label + '+';

  const renderItem = ({ item }: { item: LogEntry }) => {
    const cfg = LEVEL_CONFIG[item.levelName] || LEVEL_CONFIG.INFO;
    return (
      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        <View style={styles.rowHeader}>
          <View style={[styles.levelBadge, { backgroundColor: cfg.color + '1a' }]}>
            <View style={[styles.levelDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.levelBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={[styles.tag, { color: theme.accent }]}>{item.tag}</Text>
          {item.durationMs !== undefined && (
            <Text style={[styles.duration, { color: theme.textMuted }]}>{item.durationMs}ms</Text>
          )}
        </View>
        <Text style={[styles.time, { color: theme.placeholder }]}>{item.timestamp.substring(11, 23)}</Text>
        <Text style={[styles.msg, { color: theme.textSecondary }]} selectable numberOfLines={6}>{item.message}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="bug" size={18} color={theme.accent} style={{ marginRight: SPACING.sm }} />
          <Text style={[styles.title, { color: theme.text }]}>调试日志</Text>
          <TouchableOpacity
            onPress={() => setNewestFirst(!newestFirst)}
            activeOpacity={0.7}
            style={[styles.sortBtn, { backgroundColor: theme.bgInput }]}
          >
            <Ionicons name={newestFirst ? 'arrow-down' : 'arrow-up'} size={10} color={theme.accent} style={{ marginRight: 3 }} />
            <Text style={[styles.sortBtnText, { color: theme.accent }]}>
              {newestFirst ? '最新' : '最早'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.countBadge, { backgroundColor: theme.accentLight }]}>
            <Text style={[styles.countText, { color: theme.accent }]}>{filtered.length}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowStats(!showStats)}
            activeOpacity={0.7}
            style={[styles.iconBtn, { backgroundColor: theme.btnSecondary }]}
          >
            <Ionicons name="stats-chart" size={16} color={theme.btnSecondaryText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Logger.clear()} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ marginLeft: SPACING.md }}>
            <Ionicons name="close-circle" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {showStats && stats && (
        <View style={[styles.statsBar, { backgroundColor: theme.bgCard, borderBottomColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: theme.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>总计</Text>
          </View>
          <View style={[styles.statSplit, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#e74c3c' }]}>{stats.errors}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>错误</Text>
          </View>
          <View style={[styles.statSplit, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#FF9900' }]}>{stats.warnings}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>警告</Text>
          </View>
        </View>
      )}

      <View style={[styles.filterRow, { borderBottomColor: theme.border }]}>
        {LOG_LEVELS.map((lvl) => {
          const name = LogLevel[lvl];
          const cfg = LEVEL_CONFIG[name];
          const isActive = lvl >= showLevel;
          return (
            <TouchableOpacity
              key={lvl}
              onPress={() => setShowLevel(lvl)}
              activeOpacity={0.7}
              style={[
                styles.levelChip,
                { borderColor: isActive ? cfg.color : theme.border },
                isActive && { backgroundColor: cfg.color + '18' },
              ]}
            >
              <Text style={[styles.levelChipText, { color: isActive ? cfg.color : theme.textMuted }]}>
                {name === 'DEBUG' && lvl === showLevel ? 'ALL' : cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={[styles.filterInput, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
        placeholder="按消息或标签过滤..."
        placeholderTextColor={theme.placeholder}
        value={filter}
        onChangeText={setFilter}
        autoCorrect={false}
      />

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>暂无日志条目</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  title: { ...TYPOGRAPHY.title },
  countBadge: {
    marginLeft: SPACING.sm, paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.full, minWidth: 22, alignItems: 'center',
  },
  countText: { ...TYPOGRAPHY.monoSm, fontWeight: '700' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  sortBtnText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconBtn: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    justifyContent: 'center', alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statItem: { alignItems: 'center' },
  statVal: { ...TYPOGRAPHY.h3, fontSize: 18 },
  statLabel: { ...TYPOGRAPHY.caption, marginTop: 2 },
  statSplit: { width: 1, height: 32 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    gap: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  levelChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 1,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  levelChipText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  filterInput: {
    margin: SPACING.sm, marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, fontSize: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxxl },
  row: {
    paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm,
    paddingVertical: 2, borderRadius: RADIUS.xs,
  },
  levelDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  levelBadgeText: { ...TYPOGRAPHY.monoSm, fontWeight: '700' },
  tag: { ...TYPOGRAPHY.monoSm, marginLeft: SPACING.sm, fontWeight: '600' },
  duration: { ...TYPOGRAPHY.monoSm, marginLeft: 'auto' },
  time: { ...TYPOGRAPHY.monoSm, marginBottom: SPACING.xs },
  msg: { ...TYPOGRAPHY.mono },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
});
