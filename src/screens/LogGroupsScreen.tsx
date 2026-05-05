import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, FlatList, ActivityIndicator, RefreshControl, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useLogGroups } from '@/hooks/useCloudWatch';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import LogStreamsScreen from './LogStreamsScreen';

const TAG = 'LogGroups';

function LogGroupCard({ item, onPress, theme, index }: { item: any; onPress: () => void; theme: any; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 350, delay: Math.min(index * 60, 500),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, delay: Math.min(index * 60, 500),
        tension: 120, friction: 14, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const shortName = (name: string) => {
    const parts = name.split('/');
    return parts.length > 1 ? parts.slice(-2).join('/') : name;
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <RipplePressable onPress={onPress}>
        <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
          <View style={[styles.rowAccent, { backgroundColor: theme.accent }]} />
          <View style={styles.rowContent}>
            <View style={styles.rowHeader}>
              <Ionicons name="document-text-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{shortName(item.logGroupName)}</Text>
            </View>
            <View style={styles.rowMeta}>
              {item.storedBytes ? (
                <View style={[styles.chip, { backgroundColor: theme.bgInput }]}>
                  <Ionicons name="hardware-chip-outline" size={10} color={theme.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{formatBytes(item.storedBytes)}</Text>
                </View>
              ) : null}
              {item.retentionInDays ? (
                <View style={[styles.chip, { backgroundColor: theme.bgInput }]}>
                  <Ionicons name="time-outline" size={10} color={theme.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{item.retentionInDays}d</Text>
                </View>
              ) : null}
              {item.creationTime ? (
                <Text style={[styles.tsText, { color: theme.textMuted }]}>
                  {new Date(item.creationTime).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} style={{ marginRight: SPACING.md }} />
        </View>
      </RipplePressable>
    </Animated.View>
  );
}

export default function LogGroupsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: groups, isLoading, isRefetching, error, refetch } = useLogGroups();
  const [search, setSearch] = React.useState('');
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);

  if (selectedGroup) {
    return <LogStreamsScreen logGroupName={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  const filtered = groups?.filter((g) =>
    g.logGroupName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleTap = (groupName: string) => {
    Logger.info(TAG, 'LogGroup tapped', {
      group: groupName,
      action: 'navigate → log streams',
    });
    setSelectedGroup(groupName);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={theme.placeholder} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t('screens.logGroups.searchPlaceholder')}
          placeholderTextColor={theme.placeholder}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <RipplePressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </RipplePressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.danger} />
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
          data={filtered}
          keyExtractor={(item: any) => item.logGroupName || item.arn || ''}
          renderItem={({ item, index }) => (
            <LogGroupCard item={item} index={index} theme={theme} onPress={() => handleTap(item.logGroupName!)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching || false} onRefresh={refetch} tintColor={theme.accent} colors={[theme.accent]} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="folder-open-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {search ? t('common.noResults') : t('screens.logGroups.noGroups')}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: 15,
  },
  loader: { marginTop: 100 },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.sm, overflow: 'hidden',
  },
  rowAccent: { width: 4, alignSelf: 'stretch' },
  rowContent: { flex: 1, padding: SPACING.lg, paddingLeft: SPACING.md },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  name: { ...TYPOGRAPHY.bodyBold, flex: 1 },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  chipText: { ...TYPOGRAPHY.monoSm },
  tsText: { ...TYPOGRAPHY.caption, marginLeft: 'auto' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxxl },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  errorText: { ...TYPOGRAPHY.body, textAlign: 'center', marginVertical: SPACING.md },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  retryBtn: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  retryText: { ...TYPOGRAPHY.bodyBold },
});
