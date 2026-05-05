import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useLogStreams } from '@/hooks/useCloudWatch';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import { pushBackHandler, popBackHandler } from './MainTabs';
import LogEventsScreen from './LogEventsScreen';

const TAG = 'LogStreams';

interface Props { logGroupName: string; onBack: () => void; }

function StreamCard({ item, onPress, theme, index }: { item: any; onPress: () => void; theme: any; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300, delay: Math.min(index * 45, 500),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, delay: Math.min(index * 45, 500),
        tension: 120, friction: 14, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  const hasData = !!item.lastEventTimestamp;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <RipplePressable onPress={onPress}>
        <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
          <View style={[styles.rowAccent, { backgroundColor: hasData ? theme.accent : theme.border }]} />
          <View style={styles.rowContent}>
            <View style={styles.rowHeader}>
              <Ionicons name="list-outline" size={14} color={hasData ? theme.accent : theme.textMuted} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.logStreamName}</Text>
            </View>
            <View style={styles.metaRow}>
              {item.lastEventTimestamp ? (
                <View style={[styles.chip, { backgroundColor: theme.bgInput }]}>
                  <Ionicons name="time-outline" size={10} color={theme.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{formatTime(item.lastEventTimestamp)}</Text>
                </View>
              ) : (
                <Text style={[styles.noData, { color: theme.textMuted }]}>No events</Text>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} style={{ marginRight: SPACING.md }} />
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
    Logger.info(TAG, 'LogStream tapped', {
      group: logGroupName,
      stream: streamName,
      action: 'navigate → log events',
    });
    setSelectedStream(streamName);
  };

  const shortGroupName = logGroupName.split('/').pop() || logGroupName;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {shortGroupName}
          </Text>
          <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
            {streams?.length || 0} streams
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={streams || []}
          keyExtractor={(item: any) => item.logStreamName || item.arn || ''}
          renderItem={({ item, index }) => (
            <StreamCard item={item} index={index} theme={theme} onPress={() => handleTap(item.logStreamName!)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="document-outline" size={48} color={theme.textMuted} />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { ...TYPOGRAPHY.bodyBold },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { ...TYPOGRAPHY.title },
  subtitleText: { ...TYPOGRAPHY.caption, marginTop: 2 },
  loader: { marginTop: 100 },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.sm, overflow: 'hidden',
  },
  rowAccent: { width: 4, alignSelf: 'stretch' },
  rowContent: { flex: 1, padding: SPACING.lg, paddingLeft: SPACING.md },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  name: { ...TYPOGRAPHY.bodyBold, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  noData: { ...TYPOGRAPHY.caption },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  chipText: { ...TYPOGRAPHY.monoSm },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxxl },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
});
