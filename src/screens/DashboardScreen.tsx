import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, ScrollView, StyleSheet, Animated, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useRDSInstances } from '@/hooks/useRDS';
import { useElastiCacheClusters } from '@/hooks/useElastiCache';
import { useLoadBalancers } from '@/hooks/useELB';
import { useSecurityGroups } from '@/hooks/useEC2';
import { useFSxFileSystems } from '@/hooks/useFSx';
import { useClusters } from '@/hooks/useECS';
import { useRepositories } from '@/hooks/useECR';
import { Logger } from '@/utils/logger';
import ResourceDetailScreen, { ResourceType } from './ResourceDetailScreen';
import RipplePressable from '@/components/RipplePressable';

const TAG = 'Dashboard';

type MetricCardData = {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  accentLabel?: string;
  accentValue?: string | number;
};

function MetricCard({ metric, index, theme }: { metric: MetricCardData; index: number; theme: any }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 380, delay: Math.min(index * 70, 600), useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, delay: Math.min(index * 70, 600),
        tension: 120, friction: 12, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.metricCard,
      { backgroundColor: theme.bgCard, borderColor: theme.border },
      SHADOWS.sm,
      { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
    ]}>
      <View style={[styles.metricIcon, { backgroundColor: metric.color + '18' }]}>
        <Ionicons name={metric.icon} size={22} color={metric.color} />
      </View>
      <Text style={[styles.metricValue, { color: theme.text }]}>{metric.value}</Text>
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{metric.label}</Text>
      {metric.accentLabel ? (
        <View style={[styles.metricBadge, { backgroundColor: metric.color + '14' }]}>
          <Text style={[styles.metricBadgeLabel, { color: theme.textMuted }]}>{metric.accentLabel}</Text>
          <Text style={[styles.metricBadgeValue, { color: metric.color, fontWeight: '700' }]}>{metric.accentValue}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

function SectionHeader({ title, icon, count, theme }: { title: string; icon: keyof typeof Ionicons.glyphMap; count: number; theme: any }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Ionicons name={icon} size={16} color={theme.accent} style={{ marginRight: SPACING.sm }} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        <View style={[styles.sectionCount, { backgroundColor: theme.accentLight }]}>
          <Text style={[styles.sectionCountText, { color: theme.accent }]}>{count}</Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const rds = useRDSInstances();
  const elasticache = useElastiCacheClusters();
  const lb = useLoadBalancers();
  const sg = useSecurityGroups();
  const fsx = useFSxFileSystems();
  const ecs = useClusters();
  const ecr = useRepositories();

  const isLoading = rds.isLoading || elasticache.isLoading || lb.isLoading || sg.isLoading || fsx.isLoading;
  const refetchAll = () => {
    rds.refetch();
    elasticache.refetch();
    lb.refetch();
    sg.refetch();
    fsx.refetch();
  };

  const rdsAvailable = rds.data?.filter((i: any) => i.DBInstanceStatus === 'available').length || 0;
  const rdsUnavailable = (rds.data?.length || 0) - rdsAvailable;
  const cacheAvailable = elasticache.data?.filter((c: any) => c.CacheClusterStatus === 'available').length || 0;
  const lbActive = lb.data?.filter((l: any) => l.State?.Code === 'active').length || 0;
 
  const [detailItem, setDetailItem] = React.useState<any>(null);
  const [detailType, setDetailType] = React.useState<ResourceType>('rds');

  if (detailItem) {
    return (
      <ResourceDetailScreen
        resourceType={detailType}
        item={detailItem}
        onBack={() => setDetailItem(null)}
      />
    );
  }

  const metrics: MetricCardData[] = [
    {
      label: t('dashboard.rdsInstances'),
      value: rds.data?.length ?? '\u2014',
      icon: 'server',
      color: theme.accent,
      accentLabel: t('common.active'),
      accentValue: rdsAvailable,
    },
    {
      label: t('dashboard.cacheClusters'),
      value: elasticache.data?.length ?? '\u2014',
      icon: 'flash',
      color: '#8e44ad',
      accentLabel: t('common.active'),
      accentValue: cacheAvailable,
    },
    {
      label: t('dashboard.loadBalancers'),
      value: lb.data?.length ?? '\u2014',
      icon: 'git-network',
      color: '#2980b9',
      accentLabel: t('common.active'),
      accentValue: lbActive,
    },
    {
      label: t('dashboard.securityGroups'),
      value: sg.data?.length ?? '\u2014',
      icon: 'shield-checkmark',
      color: '#f39c12',
    },
    {
      label: t('dashboard.ecsClusters'),
      value: ecs.data?.length ?? '\u2014',
      icon: 'layers',
      color: '#e67e22',
    },
    {
      label: t('dashboard.ecrRepos'),
      value: ecr.data?.length ?? '\u2014',
      icon: 'cube',
      color: '#c0392b',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={rds.isRefetching || elasticache.isRefetching || lb.isRefetching || sg.isRefetching || fsx.isRefetching}
            onRefresh={refetchAll}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: theme.accent }]}>
            {t('dashboard.title')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textMuted }]}>
            {t('dashboard.subtitle')}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('common.loading')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              {metrics.map((metric, i) => (
                <MetricCard key={metric.label} metric={metric} index={i} theme={theme} />
              ))}
            </View>

            <SectionHeader title={t('dashboard.rdsInstances')} icon="server" count={rds.data?.length || 0} theme={theme} />
            {rds.data?.slice(0, 3).map((item: any, i: number) => (
              <MiniResourceRow
                key={item.DBInstanceIdentifier}
                name={item.DBInstanceIdentifier}
                meta={`${item.Engine} ${item.EngineVersion} | ${item.DBInstanceClass}`}
                status={item.DBInstanceStatus}
                isGood={item.DBInstanceStatus === 'available'}
                theme={theme}
                index={i}
                onPress={() => { setDetailType('rds'); setDetailItem(item); }}
              />
            ))}

            <SectionHeader title={t('dashboard.cacheClusters')} icon="flash" count={elasticache.data?.length || 0} theme={theme} />
            {elasticache.data?.slice(0, 3).map((item: any, i: number) => (
              <MiniResourceRow
                key={item.CacheClusterId}
                name={item.CacheClusterId}
                meta={`${item.Engine} ${item.EngineVersion} | ${item.CacheNodeType}`}
                status={item.CacheClusterStatus}
                isGood={item.CacheClusterStatus === 'available'}
                theme={theme}
                index={i}
                onPress={() => { setDetailType('elasticache'); setDetailItem(item); }}
              />
            ))}

            <SectionHeader title={t('dashboard.loadBalancers')} icon="git-network" count={lb.data?.length || 0} theme={theme} />
            {lb.data?.slice(0, 3).map((item: any, i: number) => (
              <MiniResourceRow
                key={item.LoadBalancerName}
                name={item.LoadBalancerName}
                meta={`${item.Type} | ${item.DNSName || ''}`}
                status={item.State?.Code}
                isGood={item.State?.Code === 'active'}
                theme={theme}
                index={i}
                onPress={() => { setDetailType('lb'); setDetailItem(item); }}
              />
            ))}

            

            <View style={{ height: SPACING.xxl }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MiniResourceRow({
  name, meta, status, isGood, theme, index, onPress,
}: {
  name: string; meta: string; status?: string; isGood: boolean; theme: any; index: number; onPress?: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 280, delay: Math.min(index * 40, 400), useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, delay: Math.min(index * 40, 400),
        tension: 140, friction: 15, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const content = (
    <Animated.View style={[
      styles.miniRow,
      { backgroundColor: theme.bgCard, borderColor: theme.border },
      SHADOWS.sm,
      { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
    ]}>
      <View style={[styles.miniAccent, { backgroundColor: isGood ? theme.success : theme.danger }]} />
      <View style={styles.miniContent}>
        <View style={styles.miniHeader}>
          <Text style={[styles.miniName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
          {status ? (
            <View style={[styles.miniStatus, { backgroundColor: isGood ? theme.success + '18' : theme.danger + '18' }]}>
              <View style={[styles.miniStatusDot, { backgroundColor: isGood ? theme.success : theme.danger }]} />
              <Text style={[styles.miniStatusText, { color: isGood ? theme.success : theme.danger }]}>{status}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.miniMeta, { color: theme.textMuted }]} numberOfLines={1}>{meta}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ marginRight: SPACING.sm }} /> : null}
    </Animated.View>
  );

  return onPress ? <RipplePressable onPress={onPress}>{content}</RipplePressable> : content;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: SPACING.xxl },
  heroSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
  heroTitle: { ...TYPOGRAPHY.h2, marginBottom: SPACING.xs },
  heroSubtitle: { ...TYPOGRAPHY.body },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.huge },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  metricCard: {
    width: '30%',
    flexGrow: 1,
    minWidth: 100,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  metricIcon: {
    width: 42, height: 42, borderRadius: RADIUS.lg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  metricValue: { ...TYPOGRAPHY.h3, fontSize: 22 },
  metricLabel: { ...TYPOGRAPHY.caption, marginTop: 2, textAlign: 'center' },
  metricBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: SPACING.sm, paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.full, gap: 4,
  },
  metricBadgeLabel: { ...TYPOGRAPHY.monoSm },
  metricBadgeValue: { ...TYPOGRAPHY.monoSm },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { ...TYPOGRAPHY.bodyBold },
  sectionCount: {
    marginLeft: SPACING.sm, paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.full, minWidth: 22, alignItems: 'center',
  },
  sectionCountText: { ...TYPOGRAPHY.monoSm, fontWeight: '700' },
  miniRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginBottom: SPACING.xs,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  miniAccent: { width: 3, alignSelf: 'stretch' },
  miniContent: { flex: 1, padding: SPACING.md, paddingLeft: SPACING.md },
  miniHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  miniName: { ...TYPOGRAPHY.bodyBold, flex: 1, marginRight: SPACING.sm },
  miniStatus: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  miniStatusDot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
  miniStatusText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  miniMeta: { ...TYPOGRAPHY.monoSm },
});
