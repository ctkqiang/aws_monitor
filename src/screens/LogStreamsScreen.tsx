import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useLogStreams } from '@/hooks/useCloudWatch';
import LogEventsScreen from './LogEventsScreen';

interface Props { logGroupName: string; onBack: () => void; }

export default function LogStreamsScreen({ logGroupName, onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: streams, isLoading } = useLogStreams(logGroupName);
  const [selectedStream, setSelectedStream] = React.useState<string | null>(null);

  if (selectedStream) {
    return <LogEventsScreen logGroupName={logGroupName} logStreamName={selectedStream} onBack={() => setSelectedStream(null)} />;
  }

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
      onPress={() => setSelectedStream(item.logStreamName)}
      activeOpacity={0.7}
    >
      <Text style={[styles.name, { color: theme.text }]}>{item.logStreamName}</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        {item.lastEventTimestamp ? formatTime(item.lastEventTimestamp) : t('common.noData')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backBtn, { color: theme.accent }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {logGroupName.split('/').pop()}
        </Text>
        <View style={{ width: 60 }} />
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={streams || []}
          keyExtractor={(item: any) => item.logStreamName}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.logStreams.noStreams')}</Text>
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
  title: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  loader: { marginTop: 100 },
  list: { padding: 12 },
  row: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15 },
});
