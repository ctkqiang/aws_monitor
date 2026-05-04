import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, TextInput, ActivityIndicator, RefreshControl, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useLogEvents } from '@/hooks/useCloudWatch';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';

interface Props { logGroupName: string; logStreamName: string; onBack: () => void; }

function EventCard({ item, theme, index }: { item: any; theme: any; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, delay: Math.min(index * 15, 600), useNativeDriver: true }).start();
  }, []);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <View style={[styles.rowAccent, { backgroundColor: theme.accent }]} />
        <View style={styles.rowContent}>
          <Text style={[styles.ts, { color: theme.accent }]}>{formatTime(item.timestamp)}</Text>
          <Text style={[styles.msg, { color: theme.text }]} selectable>{item.message}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function LogEventsScreen({ logGroupName, logStreamName, onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: events, isLoading, isRefetching, error, refetch } = useLogEvents(logGroupName, logStreamName);
  const [filter, setFilter] = React.useState('');

  React.useEffect(() => {
    Logger.info('CloudWatch', 'LogEvents screen mounted', {
      group: logGroupName,
      stream: logStreamName,
      timestamp: new Date().toISOString(),
    });
  }, [logGroupName, logStreamName]);

  const filteredEvents = filter
    ? events?.filter((e) => e.message?.toLowerCase().includes(filter.toLowerCase()))
    : events;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={() => {
          Logger.info('CloudWatch', 'LogEvents back', { stream: logStreamName });
          onBack();
        }}>
          <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
        </RipplePressable>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {logStreamName}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <TextInput
        style={[styles.filterInput, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
        placeholder={t('screens.logEvents.searchPlaceholder')}
        placeholderTextColor={theme.placeholder}
        value={filter}
        onChangeText={setFilter}
      />

      {isLoading && !events ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            {t('common.loading')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: '#e74c3c' }]}>{(error as any)?.message || t('common.error')}</Text>
          <RipplePressable onPress={() => refetch()}>
            <View style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
              <Text style={[styles.retryText, { color: theme.accentText }]}>{t('common.retry')}</Text>
            </View>
          </RipplePressable>
        </View>
      ) : (
        <FlatList
          data={filteredEvents || []}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }: { item: any; index: number }) => (
            <EventCard item={item} index={index} theme={theme} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || false}
              onRefresh={refetch}
              tintColor={theme.accent}
              colors={[theme.accent]}
              progressViewOffset={10}
            />
          }
          ListFooterComponent={
            (events && events.length >= 500) ? (
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                Showing latest 500 events. Pull to refresh.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {events && events.length === 0
                  ? t('screens.logEvents.noEvents')
                  : ''}
              </Text>
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
  title: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'center' },
  filterInput: { margin: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, fontSize: 14, borderWidth: StyleSheet.hairlineWidth },
  list: { padding: 12 },
  row: {
    flexDirection: 'row', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6, overflow: 'hidden',
  },
  rowAccent: { width: 4 },
  rowContent: { flex: 1, padding: 14, paddingLeft: 10 },
  ts: { fontSize: 10, fontWeight: '600', marginBottom: 5 },
  msg: { fontSize: 12, lineHeight: 17, fontFamily: 'monospace' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15 },
  loadingText: { fontSize: 13, marginTop: 12 },
  errorText: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText: { fontSize: 14, fontWeight: '600' },
  footerText: { textAlign: 'center', fontSize: 11, marginTop: 12, marginBottom: 24 },
});
