import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useLogEvents } from '@/hooks/useCloudWatch';

interface Props { logGroupName: string; logStreamName: string; onBack: () => void; }

export default function LogEventsScreen({ logGroupName, logStreamName, onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: events, isLoading } = useLogEvents(logGroupName, logStreamName);
  const [filter, setFilter] = React.useState('');

  const filteredEvents = filter
    ? events?.filter((e) => e.message?.toLowerCase().includes(filter.toLowerCase()))
    : events;

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toISOString().replace('T', ' ').substring(0, 23);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <Text style={[styles.ts, { color: theme.accent }]}>{formatTime(item.timestamp)}</Text>
      <Text style={[styles.msg, { color: theme.text }]} selectable>{item.message}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backBtn, { color: theme.accent }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{logStreamName}</Text>
        <View style={{ width: 60 }} />
      </View>

      <TextInput
        style={[styles.filterInput, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
        placeholder={t('screens.logEvents.searchPlaceholder')}
        placeholderTextColor={theme.placeholder}
        value={filter}
        onChangeText={setFilter}
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredEvents || []}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.logEvents.noEvents')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1 },
  backBtn: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'center' },
  filterInput: { margin: 10, padding: 10, borderRadius: 8, fontSize: 14, borderWidth: 1 },
  loader: { marginTop: 100 },
  list: { padding: 12 },
  row: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  ts: { fontSize: 11, marginBottom: 4 },
  msg: { fontSize: 13, lineHeight: 18, fontFamily: 'monospace' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15 },
});
