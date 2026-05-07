import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, TextInput, ActivityIndicator, RefreshControl, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useLogEvents } from '@/hooks/useCloudWatch';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';

const TAG = 'LogEvents';

interface Props { logGroupName: string; logStreamName: string; onBack: () => void; }

function EventCard({ item, theme, index }: { item: any; theme: any; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 280, delay: Math.min(index * 20, 500),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, delay: Math.min(index * 20, 500),
        tension: 140, friction: 15, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  return (
    <Animated.View style={[
      styles.row,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: theme.bgCard, borderColor: theme.border },
      SHADOWS.sm,
    ]}>
      <View style={[styles.rowAccent, { backgroundColor: theme.accent }]} />
      <View style={styles.rowContent}>
        <View style={styles.tsRow}>
          <Ionicons name="time-outline" size={11} color={theme.accent} style={{ marginRight: 4 }} />
          <Text style={[styles.ts, { color: theme.accent }]}>{formatTime(item.timestamp)}</Text>
        </View>
        <Text style={[styles.msg, { color: theme.text }]} selectable>{item.message}</Text>
      </View>
    </Animated.View>
  );
}

export default function LogEventsScreen({ logGroupName, logStreamName, onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: events, isLoading, isRefetching, error, refetch } = useLogEvents(logGroupName, logStreamName);
  const [filter, setFilter] = React.useState('');
  const [newestFirst, setNewestFirst] = React.useState(true);

  React.useEffect(() => {
    Logger.info(TAG, '日志事件页面已挂载', {
      group: logGroupName,
      stream: logStreamName,
    });
  }, [logGroupName, logStreamName]);

  const filteredEvents = React.useMemo(() => {
    let list = events;
    if (filter) {
      list = events?.filter((e) => e.message?.toLowerCase().includes(filter.toLowerCase()));
    }
    if (list && newestFirst) {
      return [...list]; 
    }
    return list ? [...list].reverse() : list;
  }, [events, filter, newestFirst]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={() => {
          Logger.info(TAG, '日志事件返回', { stream: logStreamName });
          onBack();
        }}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {logStreamName}
          </Text>
          <View style={styles.headerMetaRow}>
            <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
              {events?.length || 0} 条日志
            </Text>
            <RipplePressable onPress={() => setNewestFirst(!newestFirst)}>
              <View style={[styles.sortBtn, { backgroundColor: theme.bgInput }]}>
                <Ionicons name={newestFirst ? 'arrow-down' : 'arrow-up'} size={11} color={theme.accent} style={{ marginRight: 3 }} />
                <Text style={[styles.sortBtnText, { color: theme.accent }]}>
                  {newestFirst ? '最新' : '最早'}
                </Text>
              </View>
            </RipplePressable>
          </View>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.filterRow}>
        <Ionicons name="search" size={15} color={theme.placeholder} style={{ marginRight: SPACING.sm }} />
        <TextInput
          style={[styles.filterInput, { color: theme.text }]}
          placeholder={t('screens.logEvents.searchPlaceholder')}
          placeholderTextColor={theme.placeholder}
          value={filter}
          onChangeText={setFilter}
          autoCorrect={false}
        />
        {filter.length > 0 && (
          <RipplePressable onPress={() => setFilter('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </RipplePressable>
        )}
      </View>

      {isLoading && !events ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            {t('common.loading')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.danger }]}>{(error as any)?.message || t('common.error')}</Text>
          <RipplePressable onPress={() => refetch()}>
            <View style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="refresh" size={16} color={theme.accentText} style={{ marginRight: SPACING.sm }} />
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
          showsVerticalScrollIndicator={false}
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
                已显示最近 500 条日志，下拉刷新获取更多
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {events && events.length === 0
                  ? t('screens.logEvents.noEvents')
                  : filter ? t('common.noResults') : ''}
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { ...TYPOGRAPHY.bodyBold },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  sortBtnText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  title: { ...TYPOGRAPHY.title, fontSize: 14 },
  subtitleText: { ...TYPOGRAPHY.caption },
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: SPACING.md, marginBottom: 0,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  filterInput: { flex: 1, fontSize: 14 },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  row: {
    flexDirection: 'row', borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.xs, overflow: 'hidden',
  },
  rowAccent: { width: 4 },
  rowContent: { flex: 1, padding: SPACING.md, paddingLeft: SPACING.sm },
  tsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  ts: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  msg: { ...TYPOGRAPHY.mono, lineHeight: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxxl },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  errorText: { ...TYPOGRAPHY.body, textAlign: 'center', marginVertical: SPACING.md },
  retryBtn: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  retryText: { ...TYPOGRAPHY.bodyBold },
  footerText: { textAlign: 'center', fontSize: 11, marginTop: SPACING.md, marginBottom: SPACING.xl },
});
