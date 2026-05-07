import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, ScrollView, StyleSheet, Animated,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useBilling, PeriodGranularity, ServiceCost, CostDataPoint } from '@/hooks/useCostExplorer';
import { Logger } from '@/utils/logger';
import { SkeletonList } from '@/utils/animations';
import { Haptic } from '@/utils/haptics';
import BarChart from '@/components/BarChart';
import RipplePressable from '@/components/RipplePressable';

const TAG = 'Billing';

const PERIODS: { key: PeriodGranularity; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'DAILY', label: '14D', icon: 'today-outline' },
  { key: 'WEEKLY', label: '12W', icon: 'calendar-outline' },
  { key: 'MONTHLY', label: '6M', icon: 'calendar-clear-outline' },
  { key: 'YEARLY', label: '1Y', icon: 'analytics-outline' },
];

const SERVICE_COLORS = [
  '#FF9900', '#8e44ad', '#2980b9', '#27ae60', '#e74c3c',
  '#f39c12', '#1abc9c', '#3498db', '#9b59b6', '#e67e22',
  '#2ecc71', '#16a085', '#d35400', '#c0392b', '#7f8c8d',
];

function BillingHeroCard({ total, trend, trendPercent, monthlyEstimate, theme, fadeAnim }: {
  total: number; trend: string; trendPercent: number; monthlyEstimate: number; theme: any; fadeAnim: Animated.Value;
}) {
  const { t } = useTranslation();
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';
  const trendColor = trend === 'up' ? theme.danger : trend === 'down' ? theme.success : theme.textMuted;
  const trendLabel = trend === 'up' ? `+${trendPercent}%` : trend === 'down' ? `${trendPercent}%` : '0%';

  return (
    <Animated.View style={[
      styles.heroCard,
      { backgroundColor: theme.bgCard, borderColor: theme.border },
      SHADOWS.lg,
      { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
    ]}>
      <View style={styles.heroBadge}>
        <Ionicons name="wallet-outline" size={16} color={theme.accent} />
        <Text style={[styles.heroBadgeText, { color: theme.accent }]}>{t('billing.currentPeriod')}</Text>
      </View>
      <Text style={[styles.heroAmount, { color: theme.text }]}>
        ${total.toFixed(2)}
      </Text>
      <View style={styles.heroBottom}>
        <View style={[styles.trendChip, { backgroundColor: trendColor + '14' }]}>
          <Ionicons name={trendIcon} size={14} color={trendColor} style={{ marginRight: 3 }} />
          <Text style={[styles.trendText, { color: trendColor }]}>{trendLabel}</Text>
        </View>
        <Text style={[styles.estimateText, { color: theme.textMuted }]}>
          {t('billing.estMonthly')}: ${monthlyEstimate.toFixed(2)}
        </Text>
      </View>
    </Animated.View>
  );
}

function UsageBar({ label, percentage, color, theme, index }: {
  label: string; percentage: number; color: string; theme: any; index: number;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 80,
      useNativeDriver: false,
    }).start();
  }, []);

  const safePct = Math.min(Math.max(percentage, 0), 100);

  return (
    <Animated.View style={{ marginBottom: SPACING.md }}>
      <View style={styles.usageHeader}>
        <View style={styles.usageLabelRow}>
          <View style={[styles.usageDot, { backgroundColor: color }]} />
          <Text style={[styles.usageLabel, { color: theme.text }]} numberOfLines={1}>{label}</Text>
        </View>
        <Text style={[styles.usagePct, { color: theme.text }]}>{percentage.toFixed(1)}%</Text>
      </View>
      <View style={[styles.usageTrack, { backgroundColor: theme.bgInput }]}>
        <Animated.View style={[
          styles.usageFill,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${safePct}%`],
            }),
          },
        ]}>
          {safePct > 15 ? (
            <Animated.Text style={[styles.usageFillText, { opacity: widthAnim }]}>
              {percentage.toFixed(1)}%
            </Animated.Text>
          ) : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function ThresholdIndicator({ theme }: { theme: any }) {
  const { t } = useTranslation();
  const tiers = [
    { pct: 0, color: theme.success, label: t('billing.thresholdSafe') },
    { pct: 50, color: '#f39c12', label: t('billing.thresholdWarning') },
    { pct: 80, color: '#e67e22', label: t('billing.thresholdAlert') },
    { pct: 100, color: theme.danger, label: t('billing.thresholdCritical') },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="speedometer-outline" size={15} color={theme.accent} style={{ marginRight: SPACING.sm }} />
        <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('billing.usageThresholds')}</Text>
      </View>
      <View style={styles.thresholdTrack}>
        <View style={[styles.thresholdGradient, { backgroundColor: theme.bgInput }]}>
          <View style={[styles.thresholdSegment, { flex: 50, backgroundColor: theme.success + '30' }]} />
          <View style={[styles.thresholdSegment, { flex: 30, backgroundColor: '#f39c1230' }]} />
          <View style={[styles.thresholdSegment, { flex: 20, backgroundColor: theme.danger + '30' }]} />
        </View>
        <View style={styles.thresholdLabels}>
          {tiers.map((t, i) => (
            <View key={i} style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: t.color }]} />
              <Text style={[styles.thresholdText, { color: theme.textMuted }]}>{t.pct}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function BillingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [period, setPeriod] = React.useState<PeriodGranularity>('MONTHLY');
  const { data, isLoading, isRefetching, error, refetch } = useBilling(period);

  const heroFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading && data) {
      Animated.parallel([
        Animated.timing(heroFade, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(contentFade, { toValue: 1, duration: 500, delay: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [isLoading, data]);

  const chartData = (data?.dailyBreakdown || []).map((d: CostDataPoint) => ({
    label: d.date,
    value: d.amount,
    color: theme.accent,
  }));

  const totalCost = data?.services?.reduce((s, svc) => s + svc.amount, 0) || 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || false}
            onRefresh={() => { Haptic.medium(); refetch(); }}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.periodBar, { borderBottomColor: theme.border }]}
          contentContainerStyle={styles.periodContainer}
        >
          {PERIODS.map((p) => {
            const isActive = period === p.key;
            return (
              <RipplePressable
                key={p.key}
                onPress={() => {
                  Logger.info(TAG, '时间周期已切换', { from: period, to: p.key });
                  setPeriod(p.key);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <View style={[
                  styles.periodBtn,
                  isActive && { backgroundColor: theme.accentLight, borderColor: theme.accent },
                  { borderColor: theme.border },
                ]}>
                  <Ionicons name={p.icon} size={13} color={isActive ? theme.accent : theme.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.periodText, { color: isActive ? theme.accent : theme.textMuted }]}>
                    {p.label}
                  </Text>
                </View>
              </RipplePressable>
            );
          })}
        </ScrollView>

        {isLoading && !data ? (
          <SkeletonList count={6} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger }]}>
              {(error as any)?.message || t('common.error')}
            </Text>
          </View>
        ) : data ? (
          <>
            <View style={styles.heroSection}>
              <BillingHeroCard
                total={data.currentPeriodTotal}
                trend={data.trend}
                trendPercent={data.trendPercent}
                monthlyEstimate={data.monthlyEstimate}
                theme={theme}
                fadeAnim={heroFade}
              />
            </View>

            <Animated.View style={{ opacity: contentFade }}>
              <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bar-chart-outline" size={15} color={theme.accent} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('billing.spendingTrend')}</Text>
                </View>
                <BarChart
                  data={chartData}
                  height={180}
                  formatValue={(v) => v < 1 ? `$${v.toFixed(3)}` : `$${v.toFixed(1)}`}
                  emptyMessage={t('common.noData')}
                />
              </View>

              <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pie-chart-outline" size={15} color={theme.accent} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>
                    {t('billing.serviceBreakdown')} ({data.services.length})
                  </Text>
                </View>
                {data.services.length === 0 ? (
                  <Text style={[styles.sectionEmpty, { color: theme.textMuted }]}>
                    {t('common.noData')}
                  </Text>
                ) : (
                  data.services.map((svc: ServiceCost, i: number) => (
                    <UsageBar
                      key={svc.service}
                      label={`${svc.service} ($${svc.amount.toFixed(2)})`}
                      percentage={(svc.amount / totalCost) * 100}
                      color={SERVICE_COLORS[i % SERVICE_COLORS.length]}
                      theme={theme}
                      index={i}
                    />
                  ))
                )}
              </View>

              <ThresholdIndicator theme={theme} />

              <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="information-circle-outline" size={15} color={theme.accent} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('billing.billingSummary')}</Text>
                </View>
                <View style={styles.summaryGrid}>
                  <SummaryItem label={t('billing.periodTotal')} value={`$${data.currentPeriodTotal.toFixed(2)}`} theme={theme} />
                  <SummaryItem label={t('billing.previousPeriod')} value={`$${data.previousPeriodTotal.toFixed(2)}`} theme={theme} />
                  <SummaryItem label={t('billing.trend')} value={`${data.trend === 'up' ? '+' : ''}${data.trendPercent}%`} color={data.trend === 'up' ? theme.danger : data.trend === 'down' ? theme.success : theme.text} theme={theme} />
                  <SummaryItem label={t('billing.estMonthly')} value={`$${data.monthlyEstimate.toFixed(2)}`} theme={theme} />
                </View>
              </View>

              {data.services.length === 0 && data.dailyBreakdown.length === 0 && (
                <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                  <View style={styles.permissionNote}>
                    <Ionicons name="key-outline" size={20} color={theme.accent} style={{ marginRight: SPACING.sm }} />
                    <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
                      {t('billing.permissionNote')}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </>
        ) : null}

        <View style={{ height: SPACING.huge }} />
      </ScrollView>
    </View>
  );
}

function SummaryItem({ label, value, color, theme }: { label: string; value: string; color?: string; theme: any }) {
  return (
    <View style={[styles.summaryItem, { backgroundColor: theme.bgInput }]}>
      <Text style={[styles.summaryValue, { color: color || theme.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: SPACING.xxl },
  periodBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxHeight: 50,
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  periodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  periodText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  heroSection: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  heroCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  heroBadgeText: { ...TYPOGRAPHY.caption, fontWeight: '600', marginLeft: SPACING.xs },
  heroAmount: { ...TYPOGRAPHY.h1, fontSize: 40, marginBottom: SPACING.md },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  trendChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  trendText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  estimateText: { ...TYPOGRAPHY.caption },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.huge },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  errorContainer: { alignItems: 'center', paddingVertical: SPACING.huge },
  errorText: { ...TYPOGRAPHY.body, marginTop: SPACING.md, textAlign: 'center' },
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { ...TYPOGRAPHY.label },
  sectionEmpty: { ...TYPOGRAPHY.caption, textAlign: 'center', paddingVertical: SPACING.lg },
  usageHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.xs,
  },
  usageLabelRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: SPACING.sm },
  usageDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm },
  usageLabel: { ...TYPOGRAPHY.caption, flex: 1 },
  usagePct: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  usageTrack: { height: 22, borderRadius: RADIUS.full, overflow: 'hidden' },
  usageFill: {
    height: '100%',
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: SPACING.sm,
    minWidth: 2,
  },
  usageFillText: { ...TYPOGRAPHY.monoSm, color: '#fff', fontWeight: '700' },
  thresholdTrack: { marginTop: SPACING.sm },
  thresholdGradient: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  thresholdSegment: { height: '100%' },
  thresholdLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  thresholdItem: { flexDirection: 'row', alignItems: 'center' },
  thresholdDot: { width: 6, height: 6, borderRadius: 3, marginRight: 3 },
  thresholdText: { ...TYPOGRAPHY.monoSm },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  summaryItem: {
    flex: 1,
    minWidth: '40%',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  summaryValue: { ...TYPOGRAPHY.h3, fontSize: 18, marginBottom: 2 },
  summaryLabel: { ...TYPOGRAPHY.caption },
  permissionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  permissionText: { ...TYPOGRAPHY.caption, flex: 1, lineHeight: 18 },
});
