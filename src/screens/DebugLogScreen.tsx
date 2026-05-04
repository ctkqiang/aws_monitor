import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Logger, LogEntry, LogLevel } from '@/utils/logger';

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
    <View style={styles.row}>
      <Text style={[styles.level, { color: LEVEL_COLORS[item.levelName] }]}>
        [{item.levelName}]
      </Text>
      <Text style={styles.tag}>[{item.tag}]</Text>
      <Text style={styles.time}>{item.timestamp.substring(11, 23)}</Text>
      <Text style={styles.msg} numberOfLines={3}>{item.message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Logs ({filtered.length})</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => setShowLevel(showLevel === LogLevel.DEBUG ? LogLevel.ERROR : showLevel - 1)} activeOpacity={0.7}>
            <Text style={styles.actionBtn}>
              Level: {showLevel === LogLevel.DEBUG ? 'ALL' : showLevel === LogLevel.INFO ? 'INFO+' : showLevel === LogLevel.WARN ? 'WARN+' : 'ERROR'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Logger.clear()} activeOpacity={0.7}>
            <Text style={[styles.actionBtn, { color: '#e74c3c' }]}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.actionBtn}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TextInput
        style={styles.filter}
        placeholder="Filter logs..."
        placeholderTextColor="#555566"
        value={filter}
        onChangeText={setFilter}
      />
      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No log entries</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a14' },
  header: { padding: 12, backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  title: { fontSize: 16, fontWeight: '700', color: '#FF9900', marginBottom: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { fontSize: 12, color: '#8888aa', fontWeight: '600' },
  filter: { margin: 8, padding: 8, borderRadius: 6, backgroundColor: '#1a1a2e', color: '#ffffff', fontSize: 13, borderWidth: 1, borderColor: '#2a2a3e' },
  list: { paddingHorizontal: 8 },
  row: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  level: { fontSize: 10, fontWeight: '700' },
  tag: { fontSize: 10, color: '#666680' },
  time: { fontSize: 10, color: '#555566', marginBottom: 2 },
  msg: { fontSize: 12, color: '#d0d0e0', fontFamily: 'monospace' },
  empty: { textAlign: 'center', color: '#666680', marginTop: 60, fontSize: 14 },
});
