import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  Animated, TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useRDSInstances } from '@/hooks/useRDS';
import { useElastiCacheClusters } from '@/hooks/useElastiCache';
import { useLoadBalancers } from '@/hooks/useELB';
import { useSecurityGroups } from '@/hooks/useEC2';
import { useFSxFileSystems } from '@/hooks/useFSx';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';

const TAG = 'Resources';

type ResourceTab = 'rds' | 'elasticache' | 'lb' | 'sg' | 'ontap';

const TABS: { key: ResourceTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'rds', label: 'RDS', icon: 'server' },
  { key: 'elasticache', label: 'ElastiCache', icon: 'flash' },
  { key: 'lb', label: 'Load Balancers', icon: 'git-network' },
  { key: 'sg', label: 'Security Groups', icon: 'shield-checkmark' },
];

function ResourceCard({
  title, subtitle, meta, status, statusColor, theme, index, onPress,
}: {
  title: string; subtitle?: string; meta?: string; status?: string;
  statusColor?: string; theme: any; index: number; onPress?: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 320, delay: Math.min(index * 55, 500), useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, delay: Math.min(index * 55, 500),
        tension: 120, friction: 14, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const content = (
    <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
      <View style={[styles.rowAccent, { backgroundColor: statusColor || theme.accent }]} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={2}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: theme.textMuted }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
        <View style={styles.rowMeta}>
          {meta ? (
            <View style={[styles.chip, { backgroundColor: theme.bgInput }]}>
              <Text style={[styles.chipText, { color: theme.textSecondary }]}>{meta}</Text>
            </View>
          ) : null}
          {status ? (
            <View style={[styles.statusChip, { backgroundColor: (statusColor || theme.accent) + '18' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor || theme.accent }]} />
              <Text style={[styles.statusText, { color: statusColor || theme.accent }]}>{status}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={theme.textMuted} style={{ marginRight: SPACING.md }} /> : null}
    </View>
  );

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {onPress ? <RipplePressable onPress={onPress}>{content}</RipplePressable> : content}
    </Animated.View>
  );
}

export default function ResourcesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState<ResourceTab>('rds');

  const rds = useRDSInstances();
  const elasticache = useElastiCacheClusters();
  const lb = useLoadBalancers();
  const sg = useSecurityGroups();
  const fsx = useFSxFileSystems();

  const getQueryForTab = (tab: ResourceTab) => {
    switch (tab) {
      case 'rds': return rds;
      case 'elasticache': return elasticache;
      case 'lb': return lb;
      case 'sg': return sg;
      case 'ontap': return fsx;
    }
  };

  const activeQuery = getQueryForTab(activeTab);

  const renderRDSItem = ({ item, index }: { item: any; index: number }) => (
    <ResourceCard
      title={item.DBInstanceIdentifier}
      subtitle={`${item.Engine} ${item.EngineVersion} | ${item.DBInstanceClass}`}
      meta={item.Endpoint?.Address ? `${item.Endpoint.Address}:${item.Endpoint.Port}` : undefined}
      status={item.DBInstanceStatus}
      statusColor={item.DBInstanceStatus === 'available' ? theme.success : theme.danger}
      theme={theme}
      index={index}
    />
  );

  const renderElastiCacheItem = ({ item, index }: { item: any; index: number }) => (
    <ResourceCard
      title={item.CacheClusterId}
      subtitle={`${item.Engine} ${item.EngineVersion} | ${item.CacheNodeType}`}
      meta={`${item.CacheNodes?.length || 1} node(s)`}
      status={item.CacheClusterStatus}
      statusColor={item.CacheClusterStatus === 'available' ? theme.success : theme.danger}
      theme={theme}
      index={index}
    />
  );

  const renderLBItem = ({ item, index }: { item: any; index: number }) => (
    <ResourceCard
      title={item.LoadBalancerName}
      subtitle={`${item.Type} | ${item.Scheme || ''}`}
      meta={item.DNSName}
      status={item.State?.Code}
      statusColor={item.State?.Code === 'active' ? theme.success : theme.danger}
      theme={theme}
      index={index}
    />
  );

  const renderSGItem = ({ item, index }: { item: any; index: number }) => {
    const inboundCount = item.IpPermissions?.length || 0;
    const outboundCount = item.IpPermissionsEgress?.length || 0;
    return (
      <ResourceCard
        title={item.GroupName}
        subtitle={item.Description || item.GroupId}
        meta={`In: ${inboundCount} rules | Out: ${outboundCount} rules`}
        theme={theme}
        index={index}
      />
    );
  };

  const renderONTAPItem = ({ item, index }: { item: any; index: number }) => (
    <ResourceCard
      title={item.FileSystemId}
      subtitle={`${item.FileSystemType} | ${item.StorageType || ''}`}
      meta={`${item.StorageCapacity || 0} GiB | ${item.SubnetIds?.length || 0} subnet(s)`}
      status={item.Lifecycle}
      statusColor={item.Lifecycle === 'AVAILABLE' ? theme.success : theme.danger}
      theme={theme}
      index={index}
    />
  );

  const getRenderFn = () => {
    switch (activeTab) {
      case 'rds': return renderRDSItem;
      case 'elasticache': return renderElastiCacheItem;
      case 'lb': return renderLBItem;
      case 'sg': return renderSGItem;
      case 'ontap': return renderONTAPItem;
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'rds': return t('dashboard.noRDS') || 'No RDS instances found';
      case 'elasticache': return t('dashboard.noCache') || 'No ElastiCache clusters found';
      case 'lb': return t('dashboard.noLB') || 'No Load Balancers found';
      case 'sg': return t('dashboard.noSG') || 'No Security Groups found';
      case 'ontap': return t('dashboard.noONTAP') || 'No ONTAP storage systems found';
    }
  };

  const getData = () => {
    switch (activeTab) {
      case 'rds': return rds.data || [];
      case 'elasticache': return elasticache.data || [];
      case 'lb': return lb.data || [];
      case 'sg': return sg.data || [];
      case 'ontap': return (fsx.data || []).filter((f: any) => f.FileSystemType === 'ONTAP');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabScroll, { backgroundColor: theme.bgCard, borderBottomColor: theme.border }]}
        contentContainerStyle={styles.tabContainer}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                isActive && { backgroundColor: theme.accentLight },
              ]}
              onPress={() => {
                Logger.info(TAG, 'Resource tab switched', { to: tab.key });
                setActiveTab(tab.key);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon} size={14} color={isActive ? theme.accent : theme.textMuted} style={{ marginRight: SPACING.xs }} />
              <Text style={[styles.tabText, { color: isActive ? theme.accent : theme.textMuted }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('common.loading')}</Text>
        </View>
      ) : activeQuery.error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.danger }]}>
            {(activeQuery.error as any)?.message || t('common.error')}
          </Text>
          <RipplePressable onPress={() => activeQuery.refetch()}>
            <View style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="refresh" size={16} color={theme.accentText} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.retryText, { color: theme.accentText }]}>{t('common.retry')}</Text>
            </View>
          </RipplePressable>
        </View>
      ) : (
        <FlatList
          data={getData()}
          keyExtractor={(item: any) => item.DBInstanceIdentifier || item.CacheClusterId || item.LoadBalancerName || item.FileSystemId || item.GroupId || Math.random().toString()}
          renderItem={getRenderFn()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isRefetching || false}
              onRefresh={() => activeQuery.refetch()}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="cube-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{getEmptyMessage()}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabScroll: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 52 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm, alignItems: 'center' },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
  tabText: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth, marginBottom: SPACING.sm, overflow: 'hidden' },
  rowAccent: { width: 4, alignSelf: 'stretch' },
  rowContent: { flex: 1, padding: SPACING.lg, paddingLeft: SPACING.md },
  rowTitle: { ...TYPOGRAPHY.bodyBold, marginBottom: SPACING.xs },
  rowSubtitle: { ...TYPOGRAPHY.caption, marginBottom: SPACING.sm },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  chip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm },
  chipText: { ...TYPOGRAPHY.monoSm },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxxl },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  errorText: { ...TYPOGRAPHY.body, textAlign: 'center', marginVertical: SPACING.md },
  retryBtn: { marginTop: SPACING.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md, borderRadius: RADIUS.lg },
  retryText: { ...TYPOGRAPHY.bodyBold },
});
