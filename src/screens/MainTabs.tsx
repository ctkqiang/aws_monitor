import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, TouchableOpacity, StyleSheet, BackHandler, Modal,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useResolvedThemeMode } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useCurrentUser } from '@/hooks/useIAM';
import { useLogGroups } from '@/hooks/useCloudWatch';
import { Logger } from '@/utils/logger';
import LogGroupsScreen from './LogGroupsScreen';
import ECSServicesScreen from './ECSServicesScreen';
import ECRReposScreen from './ECRReposScreen';
import ResourcesScreen from './ResourcesScreen';
import DashboardScreen from './DashboardScreen';
import SettingsScreen from './SettingsScreen';

type Tab = 'dashboard' | 'logs' | 'ecs' | 'ecr' | 'resources' | 'settings';

const TAB_ICONS: Record<Tab, keyof typeof Ionicons.glyphMap> = {
  dashboard: 'apps',
  logs: 'bar-chart',
  ecs: 'server',
  ecr: 'cube',
  resources: 'albums',
  settings: 'options',
};

const TAG = 'MainTabs';

let screenStack: Array<() => boolean> = [];

export function pushBackHandler(handler: () => boolean) {
  screenStack.push(handler);
}

export function popBackHandler() {
  screenStack.pop();
}

export default function MainTabs() {
  const { t } = useTranslation();
  const theme = useTheme();
  const resolvedMode = useResolvedThemeMode();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<Tab>('dashboard');
  const { data: iamUser } = useCurrentUser();
  const [showCloudWatchModal, setShowCloudWatchModal] = React.useState(false);
  const { data: logGroups } = useLogGroups();

  const tabIndicatorLeft = useRef(new Animated.Value(0)).current;
  const tabWidths = useRef<Record<Tab, number>>({
    dashboard: 0, logs: 0, ecs: 0, ecr: 0, resources: 0, settings: 0,
  });
  const tabPositions = useRef<Record<Tab, number>>({
    dashboard: 0, logs: 0, ecs: 0, ecr: 0, resources: 0, settings: 0,
  });

  useEffect(() => {
    const onBack = () => {
      if (screenStack.length > 0) {
        const handler = screenStack[screenStack.length - 1];
        return handler();
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Animated.spring(tabIndicatorLeft, {
      toValue: tabPositions.current[activeTab],
      tension: 180,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: t('tabs.dashboard') },
    { key: 'logs', label: t('tabs.logs') },
    { key: 'ecs', label: t('tabs.ecs') },
    { key: 'ecr', label: t('tabs.ecr') },
    { key: 'resources', label: t('tabs.resources') },
    { key: 'settings', label: t('common.settings') },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardScreen />;
      case 'logs': return <LogGroupsScreen />;
      case 'ecs': return <ECSServicesScreen />;
      case 'ecr': return <ECRReposScreen />;
      case 'resources': return <ResourcesScreen />;
      case 'settings': return <SettingsScreen />;
    }
  };

  const isActive = iamUser?.status === 'active';
  const displayName = iamUser?.username || t('common.awSuser');
  const totalGroups = logGroups?.length || 0;
  const totalStorageBytes = logGroups?.reduce((sum, g) => sum + (g.storedBytes || 0), 0) || 0;
  const totalStorage = totalStorageBytes > 1024 * 1024 * 1024
    ? `${(totalStorageBytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    : `${(totalStorageBytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              Logger.info(TAG, 'CloudWatch overview opened');
              setShowCloudWatchModal(true);
            }}
            activeOpacity={0.7}
            style={styles.avatarTouchable}
            accessibilityRole="button"
            accessibilityLabel="CloudWatch overview"
          >
            <View style={[styles.avatarRing, { borderColor: isActive ? theme.success : theme.border }]}>
              <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            </View>
            <View style={[styles.statusDot, { backgroundColor: isActive ? theme.success : theme.danger }]} />
          </TouchableOpacity>
          <View style={styles.headerMeta}>
            <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.headerStatusRow}>
              <Ionicons
                name={isActive ? 'checkmark-circle' : 'alert-circle'}
                size={12}
                color={isActive ? theme.success : theme.danger}
                style={styles.statusIcon}
              />
              <Text style={[styles.headerStatus, { color: isActive ? theme.success : theme.danger }]}>
                {isActive ? t('common.active') : t('common.inactive')}
              </Text>
              {iamUser?.accountId && (
                <View style={[styles.accountChip, { backgroundColor: theme.bgInput }]}>
                  <Ionicons name="cloud-outline" size={10} color={theme.textMuted} style={{ marginRight: 3 }} />
                  <Text style={[styles.accountChipText, { color: theme.textMuted }]}>
                    {iamUser.accountId}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {renderScreen()}
      </View>

      <View style={[
        styles.tabBar,
        {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.tabBarBorder,
          paddingBottom: Math.max(insets.bottom || 0, SPACING.sm),
        },
      ]}>
        <Animated.View style={[
          styles.tabIndicator,
          {
            backgroundColor: theme.accent,
            width: 40,
            transform: [{ translateX: tabIndicatorLeft }],
          },
        ]} />
        {tabs.map((tab) => {
          const isActiveTab = activeTab === tab.key;
          const iconColor = isActiveTab ? theme.accent : theme.tabInactive;
          const textColor = isActiveTab ? theme.accent : theme.tabInactive;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => {
                Logger.info(TAG, 'Tab switched', { from: activeTab, to: tab.key });
                setActiveTab(tab.key);
              }}
              onLayout={(e) => {
                tabWidths.current[tab.key] = e.nativeEvent.layout.width;
                const index = tabs.findIndex((t) => t.key === tab.key);
                tabPositions.current[tab.key] = e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2 - 20;
              }}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActiveTab }}
              accessibilityLabel={tab.label}
            >
              <Ionicons name={TAB_ICONS[tab.key]} size={20} color={iconColor} style={styles.tabIcon} />
              <Text style={[
                TYPOGRAPHY.tab,
                { color: textColor },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={showCloudWatchModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCloudWatchModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCloudWatchModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.bgCard, ...SHADOWS.xl }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="analytics" size={20} color={theme.accent} style={{ marginRight: SPACING.sm }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>{t('cloudwatch.overview')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCloudWatchModal(false)} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={28} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.metricCard, { backgroundColor: theme.bgInput }]}>
                <View style={[styles.metricIconBox, { backgroundColor: theme.accentLight }]}>
                  <Ionicons name="folder-outline" size={20} color={theme.accent} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{totalGroups}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{t('cloudwatch.logGroups')}</Text>
                </View>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.bgInput }]}>
                <View style={[styles.metricIconBox, { backgroundColor: theme.accentLight }]}>
                  <Ionicons name="server-outline" size={20} color={theme.accent} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{totalStorage}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{t('cloudwatch.totalStorage')}</Text>
                </View>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.bgInput }]}>
                <View style={[styles.metricIconBox, { backgroundColor: 'rgba(39,174,96,0.12)' }]}>
                  <Ionicons name="pulse-outline" size={20} color={theme.success} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={[styles.metricValue, { color: theme.success }]}>{t('common.active')}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{t('screens.ecsServices.status')}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.accent }]}
              onPress={() => {
                setShowCloudWatchModal(false);
                setActiveTab('logs');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalBtnText, { color: theme.accentText }]}>{t('tabs.logs')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  avatarTouchable: { position: 'relative', marginRight: SPACING.md },
  avatarRing: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#0f0f1a',
  },
  headerMeta: { flex: 1 },
  headerName: { ...TYPOGRAPHY.title, marginBottom: 2 },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  statusIcon: { marginRight: 3 },
  headerStatus: { ...TYPOGRAPHY.caption },
  accountChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.xs, marginLeft: SPACING.sm,
  },
  accountChipText: { ...TYPOGRAPHY.monoSm },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  tabIcon: { marginBottom: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SPACING.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { ...TYPOGRAPHY.title },
  modalBody: { padding: SPACING.xl, gap: SPACING.md },
  metricCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.lg, borderRadius: RADIUS.lg,
  },
  metricIconBox: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  metricInfo: { flex: 1 },
  metricValue: { ...TYPOGRAPHY.h3, fontSize: 18 },
  metricLabel: { ...TYPOGRAPHY.caption, marginTop: 1 },
  modalBtn: {
    margin: SPACING.xl, marginTop: 0,
    height: 50, borderRadius: RADIUS.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  modalBtnText: { ...TYPOGRAPHY.button, fontSize: 15 },
});
