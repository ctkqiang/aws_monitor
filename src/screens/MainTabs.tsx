import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import LogGroupsScreen from './LogGroupsScreen';
import ECSServicesScreen from './ECSServicesScreen';
import ECRReposScreen from './ECRReposScreen';
import SettingsScreen from './SettingsScreen';

type Tab = 'logs' | 'ecs' | 'ecr' | 'settings';

export default function MainTabs() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<Tab>('logs');

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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <View style={[
        styles.tabBar,
        { backgroundColor: theme.tabBarBg, borderTopColor: theme.tabBarBorder, paddingBottom: insets.bottom || 8 },
      ]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: theme.tabInactive }, activeTab === tab.key && { color: theme.accent, fontWeight: '600' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabText: { fontSize: 12 },
});
