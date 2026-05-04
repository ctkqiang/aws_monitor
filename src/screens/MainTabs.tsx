import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, TouchableOpacity, StyleSheet, BackHandler, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { useCurrentUser } from '@/hooks/useIAM';
import { useLogGroups } from '@/hooks/useCloudWatch';
import LogGroupsScreen from './LogGroupsScreen';
import ECSServicesScreen from './ECSServicesScreen';
import ECRReposScreen from './ECRReposScreen';
import SettingsScreen from './SettingsScreen';

type Tab = 'logs' | 'ecs' | 'ecr' | 'settings';

const TAB_ICONS: Record<Tab, keyof typeof Ionicons.glyphMap> = {
  logs: 'bar-chart',
  ecs: 'server',
  ecr: 'cube',
  settings: 'options',
};

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
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<Tab>('logs');
  const { data: iamUser } = useCurrentUser();
  const [showCloudWatchModal, setShowCloudWatchModal] = React.useState(false);
  const { data: logGroups } = useLogGroups();

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'logs', label: t('tabs.logs') },
    { key: 'ecs', label: t('tabs.ecs') },
    { key: 'ecr', label: t('tabs.ecr') },
    { key: 'settings', label: t('common.settings') },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'logs': return <LogGroupsScreen />;
      case 'ecs': return <ECSServicesScreen />;
      case 'ecr': return <ECRReposScreen />;
      case 'settings': return <SettingsScreen />;
    }
  };

  const isActive = iamUser?.status === 'active';
  const displayName = iamUser?.username || 'AWS User';
  const totalGroups = logGroups?.length || 0;
  const totalStorageBytes = logGroups?.reduce((sum, g) => sum + (g.storedBytes || 0), 0) || 0;
  const totalStorage = totalStorageBytes > 1024 * 1024 * 1024
    ? `${(totalStorageBytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    : `${(totalStorageBytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.bg }]}>
        <View style={styles.headerBg} />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => setShowCloudWatchModal(true)} activeOpacity={0.7} style={styles.avatarTouchable}>
            <View style={[styles.avatarRing, { borderColor: isActive ? '#27ae60' : theme.border }]}>
              <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.headerMeta}>
            <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.headerStatusRow}>
              <Ionicons
                name={isActive ? 'checkmark-circle' : 'alert-circle'}
                size={14}
                color={isActive ? '#27ae60' : theme.danger}
                style={styles.statusIcon}
              />
              <Text style={[styles.headerStatus, { color: isActive ? '#27ae60' : theme.danger }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
              {iamUser?.accountId && (
                <View style={[styles.accountChip, { backgroundColor: theme.bgInput }]}>
                  <Ionicons name="cloud" size={10} color={theme.textMuted} style={{ marginRight: 3 }} />
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
          backgroundColor: theme.bg,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom || 0, 6),
        },
      ]}>
        {tabs.map((tab) => {
          const isActiveTab = activeTab === tab.key;
          const iconColor = isActiveTab ? theme.accent : theme.tabInactive;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              {isActiveTab && (
                <View style={[styles.tabIndicator, { backgroundColor: theme.accent }]} />
              )}
              <Ionicons name={TAB_ICONS[tab.key]} size={20} color={iconColor} style={styles.tabIcon} />
              <Text style={[
                styles.tabText,
                { color: theme.tabInactive },
                isActiveTab && { color: theme.accent, fontWeight: '700' },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={showCloudWatchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCloudWatchModal(false)}
      >
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: theme.bgCard }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>CloudWatch Overview</Text>
              <TouchableOpacity onPress={() => setShowCloudWatchModal(false)} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={28} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.metricCard, { backgroundColor: theme.bgInput }]}>
                <Ionicons name="folder" size={22} color={theme.accent} style={styles.metricIcon} />
                <View>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{totalGroups}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Log Groups</Text>
                </View>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.bgInput }]}>
                <Ionicons name="server" size={22} color={theme.accent} style={styles.metricIcon} />
                <View>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{totalStorage}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Total Storage</Text>
                </View>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.bgInput }]}>
                <Ionicons name="pulse" size={22} color="#27ae60" style={styles.metricIcon} />
                <View>
                  <Text style={[styles.metricValue, { color: '#27ae60' }]}>Active</Text>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Status</Text>
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
              <Text style={[styles.modalBtnText, { color: theme.accentText }]}>Open CloudWatch Logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { overflow: 'hidden' },
  headerBg: {
    position: 'absolute', top: -40, left: 0, right: 0,
    height: 160, opacity: 0.06, backgroundColor: '#FF9900', borderRadius: 200,
  },
  headerContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  avatarTouchable: { marginRight: 14 },
  avatarRing: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '800', color: '#ffffff' },
  headerMeta: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  statusIcon: { marginRight: 4 },
  headerStatus: { fontSize: 12, fontWeight: '600', marginRight: 10 },
  accountChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  accountChipText: { fontSize: 10, fontWeight: '600' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingVertical: 8 },
  tabIcon: { marginBottom: 4 },
  tabText: { fontSize: 11, fontWeight: '500' },
  tabIndicator: { width: 28, height: 3, borderRadius: 2, marginBottom: 6 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 16, marginBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalBody: { marginBottom: 20 },
  metricCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 14, marginBottom: 10,
  },
  metricIcon: { marginRight: 14 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 12, marginTop: 2 },
  modalBtn: {
    padding: 16, borderRadius: 14, alignItems: 'center',
  },
  modalBtnText: { fontSize: 16, fontWeight: '700' },
});
