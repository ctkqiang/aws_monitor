import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useLogStreams } from '@/hooks/useCloudWatch';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import { pushBackHandler, popBackHandler } from './MainTabs';
import LogEventsScreen from './LogEventsScreen';

interface Props { logGroupName: string; onBack: () => void; }

function StreamCard({ item, onPress, theme, index }: { item: any; onPress: () => void; theme: any; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true }).start();
  }, []);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      <RipplePressable onPress={onPress}>
        <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={[styles.rowAccent, { backgroundColor: theme.accent }]} />
          <View style={styles.rowContent}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.logStreamName}</Text>
            <View style={styles.metaRow}>
              {item.lastEventTimestamp ? (
                <View style={[styles.chip, { backgroundColor: theme.bgInput }]}>
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{formatTime(item.lastEventTimestamp)}</Text>
                </View>
              ) : (
                <Text style={[styles.noData, { color: theme.textMuted }]}>No data</Text>
              )}
            </View>
          </View>
          <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
        </View>
      </RipplePressable>
    </Animated.View>
  );
}

export default function LogStreamsScreen({ logGroupName, onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: streams, isLoading } = useLogStreams(logGroupName);
  const [selectedStream, setSelectedStream] = React.useState<string | null>(null);

  useEffect(() => {
    if (selectedStream) {
      pushBackHandler(() => { setSelectedStream(null); return true; });
      return () => popBackHandler();
    }
  }, [selectedStream]);

  if (selectedStream) {
    return <LogEventsScreen logGroupName={logGroupName} logStreamName={selectedStream} onBack={() => setSelectedStream(null)} />;
  }

  const handleTap = (streamName: string) => {
    Logger.info('CloudWatch', 'LogStream tapped', {
      group: logGroupName,
      stream: streamName,
      action: 'navigate → log events',
      timestamp: new Date().toISOString(),
    });
    setSelectedStream(streamName);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
        </RipplePressable>
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
          renderItem={({ item, index }) => (
            <StreamCard item={item} index={index} theme={theme} onPress={() => handleTap(item.logStreamName)} />
          )}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  loader: { marginTop: 100 },
  list: { padding: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8, overflow: 'hidden',
  },
  rowAccent: { width: 4, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0 },
  rowContent: { flex: 1, padding: 16, paddingLeft: 18 },
  name: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  noData: { fontSize: 12 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 22, fontWeight: '300', marginRight: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15 },
});
