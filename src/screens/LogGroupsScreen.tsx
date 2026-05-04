import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, FlatList, ActivityIndicator, RefreshControl, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useLogGroups } from '@/hooks/useCloudWatch';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import { pushBackHandler, popBackHandler } from './MainTabs';
import LogStreamsScreen from './LogStreamsScreen';

function LogGroupCard({ item, onPress, theme, index }: { item: any; onPress: () => void; theme: any; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 300, delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <RipplePressable onPress={onPress}>
        <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={[styles.rowAccent, { backgroundColor: theme.accent }]} />
          <View style={styles.rowContent}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.logGroupName}</Text>
            <View style={styles.rowMeta}>
              {item.storedBytes ? (
                <View style={[styles.chip, { backgroundColor: theme.bgInput }]}>
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{formatBytes(item.storedBytes)}</Text>
                </View>
              ) : null}
              {item.retentionInDays ? (
                <View style={[styles.chip, { backgroundColor: theme.bgInput, marginLeft: 6 }]}>
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{item.retentionInDays}d</Text>
                </View>
              ) : null}
              {item.creationTime ? (
                <Text style={[styles.tsText, { color: theme.textMuted }]}>
                  Since {new Date(item.creationTime).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
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
    Logger.info('CloudWatch', 'LogGroup tapped', {
      group: groupName,
      action: 'navigate → log streams',
      timestamp: new Date().toISOString(),
    });
    setSelectedGroup(groupName);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
        placeholder={t('screens.logGroups.searchPlaceholder')}
        placeholderTextColor={theme.placeholder}
        value={search}
        onChangeText={setSearch}
      />
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: '#e74c3c' }]}>{(error as any)?.message || t('common.error')}</Text>
          <RipplePressable onPress={() => refetch()}>
            <View style={[styles.btn, { backgroundColor: theme.accent }]}>
              <Text style={[styles.btnText, { color: theme.accentText }]}>{t('common.retry')}</Text>
            </View>
          </RipplePressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.logGroupName || item.arn || ''}
          renderItem={({ item, index }) => (
            <LogGroupCard item={item} index={index} theme={theme} onPress={() => handleTap(item.logGroupName)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching || false} onRefresh={refetch} tintColor={theme.accent} colors={[theme.accent]} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.logGroups.noGroups')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInput: { margin: 12, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, fontSize: 15, borderWidth: StyleSheet.hairlineWidth },
  loader: { marginTop: 100 },
  list: { paddingHorizontal: 12, paddingBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8, overflow: 'hidden',
  },
  rowAccent: { width: 4, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0 },
  rowContent: { flex: 1, padding: 16, paddingLeft: 18 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 8, lineHeight: 20 },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: '600' },
  tsText: { fontSize: 11, marginLeft: 6 },
  chevron: { fontSize: 22, fontWeight: '300', marginRight: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15, marginBottom: 12 },
  btn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  btnText: { fontSize: 14, fontWeight: '600' },
});
