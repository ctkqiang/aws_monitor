import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { useCurrentUser } from '@/hooks/useIAM';
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

export default function MainTabs() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<Tab>('logs');
  const { data: iamUser } = useCurrentUser();

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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.appBar, { backgroundColor: theme.bgCard, borderBottomColor: theme.border }]}>
        <View style={styles.appBarLeft}>
          <Ionicons name="cloud" size={22} color={theme.accent} />
          <Text style={[styles.appTitle, { color: theme.text }]}>AWSight</Text>
        </View>
        <View style={styles.appBarRight}>
          <View style={[styles.avatarSm, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarSmText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={[styles.username, { color: theme.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? '#27ae60' : theme.danger }]} />
              <Text style={[styles.statusLabel, { color: theme.textMuted }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
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
          backgroundColor: theme.bgCard,
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
              <Ionicons name={TAB_ICONS[tab.key]} size={18} color={iconColor} style={styles.tabIcon} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarSmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  userMeta: {
    alignItems: 'flex-end',
  },
  username: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 100,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  tabIcon: {
    marginBottom: 3,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIndicator: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
  },
});
