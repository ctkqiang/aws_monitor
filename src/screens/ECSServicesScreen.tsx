import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useClusters, useServices, useRestartService } from '@/hooks/useECS';
import { useUIStore } from '@/stores/uiStore';

export default function ECSServicesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: clusters, isLoading: clustersLoading, error: clustersError } = useClusters();
  const selectedCluster = useUIStore((s) => s.selectedCluster);
  const setSelectedCluster = useUIStore((s) => s.setSelectedCluster);
  const { data: services, isLoading: servicesLoading, error: servicesError } = useServices(selectedCluster);
  const restart = useRestartService();

  const handleRestart = (serviceName: string) => {
    if (!selectedCluster) return;
    Alert.alert(
      t('screens.ecsServices.restartConfirm', { name: serviceName }),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.restart'),
          onPress: () => {
            restart.mutate({ clusterArn: selectedCluster, serviceName });
          },
        },
      ]
    );
  };

  const shortName = (arn: string) => arn.split('/').pop() || arn;

  const renderClusterItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
      onPress={() => setSelectedCluster(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.rowName, { color: theme.text }]}>{shortName(item)}</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>{item}</Text>
    </TouchableOpacity>
  );

  const renderServiceItem = ({ item }: { item: any }) => (
    <View style={[styles.svcCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={styles.svcHead}>
        <Text style={[styles.svcName, { color: theme.text }]}>{item.serviceName}</Text>
        <Text style={[styles.svcStatus, { color: item.status === 'ACTIVE' ? '#27ae60' : theme.danger }]}>
          {item.status}
        </Text>
      </View>
      <View style={styles.svcStats}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: theme.textLabel }]}>{t('screens.ecsServices.desired')}</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{item.desiredCount}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: theme.textLabel }]}>{t('screens.ecsServices.running')}</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{item.runningCount}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: theme.textLabel }]}>{item.launchType}</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{item.taskDefinition?.split('/').pop()}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.restartBtn, { backgroundColor: theme.accent }]}
        onPress={() => handleRestart(item.serviceName)}
        activeOpacity={0.8}
        disabled={restart.isPending}
      >
        <Text style={[styles.restartText, { color: theme.accentText }]}>
          {restart.isPending ? '⏳' : t('common.restart')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (selectedCluster) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => setSelectedCluster(null)} activeOpacity={0.7}>
            <Text style={[styles.backBtn, { color: theme.accent }]}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.appName, { color: theme.text }]} numberOfLines={1}>
            {shortName(selectedCluster)}
          </Text>
          <View style={{ width: 60 }} />
        </View>
        {servicesLoading ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
        ) : servicesError ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: '#e74c3c' }]}>{(servicesError as any)?.message || t('common.error')}</Text>
          </View>
        ) : (
          <FlatList
            data={services || []}
            keyExtractor={(s: any) => s.serviceArn}
            renderItem={renderServiceItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.ecsServices.noServices')}</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {clustersLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : clustersError ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: '#e74c3c' }]}>{(clustersError as any)?.message || t('common.error')}</Text>
        </View>
      ) : (
        <FlatList
          data={clusters || []}
          keyExtractor={(item: string) => item}
          renderItem={renderClusterItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.ecsServices.noClusters')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1 },
  backBtn: { fontSize: 15, fontWeight: '600' },
  appName: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  loader: { marginTop: 100 },
  list: { padding: 12 },
  row: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  rowName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 11 },
  svcCard: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  svcHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  svcName: { fontSize: 15, fontWeight: '600', flex: 1 },
  svcStatus: { fontSize: 12, fontWeight: '700' },
  svcStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stat: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 11, marginBottom: 2 },
  statVal: { fontSize: 14, fontWeight: '600' },
  restartBtn: { padding: 10, borderRadius: 8, alignItems: 'center' },
  restartText: { fontSize: 14, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15 },
});
