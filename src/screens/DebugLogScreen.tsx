import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Logger, LogEntry, LogLevel } from '@/utils/logger';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  onClose: () => void;
}

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: '#8888aa',
  INFO: '#27ae60',
  WARN: '#FF9900',
  ERROR: '#e74c3c',
};

export default function DebugLogScreen({ onClose }: Props) {
  const theme = useTheme();
  const [entries, setEntries] = React.useState<LogEntry[]>([]);
  const [filter, setFilter] = React.useState('');
  const [showLevel, setShowLevel] = React.useState<LogLevel>(LogLevel.INFO);

  React.useEffect(() => {
    const refresh = () => setEntries(Logger.getEntries());
    refresh();
    return Logger.subscribe(refresh);
  }, []);

  const filtered = entries.filter((e) => {
    if (e.level < showLevel) return false;
    if (filter && !e.message.toLowerCase().includes(filter.toLowerCase()) && !e.tag.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const renderItem = ({ item }: { item: LogEntry }) => (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Text style={[styles.level, { color: LEVEL_COLORS[item.levelName] }]}>
        [{item.levelName}]
      </Text>
      <Text style={[styles.tag, { color: theme.textMuted }]}>[{item.tag}]</Text>
      <Text style={[styles.time, { color: theme.placeholder }]}>{item.timestamp.substring(11, 23)}</Text>
      <Text style={[styles.msg, { color: theme.textSecondary }]} numberOfLines={3}>{item.message}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.accent }]}>Debug Logs ({filtered.length})</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => setShowLevel(showLevel === LogLevel.DEBUG ? LogLevel.ERROR : showLevel - 1)} activeOpacity={0.7}>
            <Text style={[styles.actionBtn, { color: theme.textLabel }]}>
              Level: {showLevel === LogLevel.DEBUG ? 'ALL' : showLevel === LogLevel.INFO ? 'INFO+' : showLevel === LogLevel.WARN ? 'WARN+' : 'ERROR'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Logger.clear()} activeOpacity={0.7}>
            <Text style={[styles.actionBtn, { color: theme.danger }]}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.actionBtn, { color: theme.textLabel }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TextInput
        style={[styles.filter, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
        placeholder="Filter logs..."
        placeholderTextColor={theme.placeholder}
        value={filter}
        onChangeText={setFilter}
      />
      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.textMuted }]}>No log entries</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { fontSize: 12, fontWeight: '600' },
  filter: { margin: 8, padding: 10, borderRadius: 8, fontSize: 13, borderWidth: StyleSheet.hairlineWidth },
  list: { paddingHorizontal: 8 },
  row: { paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  level: { fontSize: 10, fontWeight: '700' },
  tag: { fontSize: 10 },
  time: { fontSize: 10, marginBottom: 2 },
  msg: { fontSize: 12, fontFamily: 'monospace' },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
