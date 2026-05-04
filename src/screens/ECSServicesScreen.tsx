import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useClusters, useServices, useRestartService } from '@/hooks/useECS';
import { useTaskDefinition } from '@/hooks/useECSTaskDef';
import { useUIStore } from '@/stores/uiStore';
import { Logger } from '@/utils/logger';

export default function ECSServicesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: clusters, isLoading: clustersLoading, isRefetching: clustersRefetch, error: clustersError, refetch: refetchClusters } = useClusters();
  const selectedCluster = useUIStore((s) => s.selectedCluster);
  const setSelectedCluster = useUIStore((s) => s.setSelectedCluster);
  const { data: services, isLoading: servicesLoading, isRefetching: servicesRefetch, error: servicesError, refetch: refetchServices } = useServices(selectedCluster);
  const restart = useRestartService();
  const [selectedTaskDef, setSelectedTaskDef] = React.useState<string | null>(null);

  const handleRestart = (serviceName: string) => {
    if (!selectedCluster) return;
    Alert.alert(
      t('screens.ecsServices.restartConfirm', { name: serviceName }),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.restart'), onPress: () => restart.mutate({ clusterArn: selectedCluster, serviceName }) },
      ]
    );
  };

  const shortName = (arn: string) => arn.split('/').pop() || arn;

  if (selectedTaskDef) {
    return <TaskDefView taskDefArn={selectedTaskDef} onBack={() => setSelectedTaskDef(null)} />;
  }

  const renderClusterItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
      onPress={() => {
        Logger.info('UI', 'ECS cluster tapped', { arn: item });
        setSelectedCluster(item);
      }}
      activeOpacity={0.6}
    >
      <View style={[styles.rowAccent, { backgroundColor: theme.accent }]} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: theme.text }]}>{shortName(item)}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>{item}</Text>
      </View>
      <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
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
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: theme.textLabel }]}>{t('screens.ecsServices.desired')}</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{item.desiredCount}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: theme.textLabel }]}>{t('screens.ecsServices.running')}</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{item.runningCount}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: theme.textLabel }]}>{item.launchType}</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{item.taskDefinition?.split('/').pop()}</Text>
        </View>
      </View>
      <View style={styles.svcActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.btnSecondary }]}
          onPress={() => item.taskDefinition && setSelectedTaskDef(item.taskDefinition)}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, { color: theme.btnSecondaryText }]}>Task Def</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.accent }]}
          onPress={() => handleRestart(item.serviceName)}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: theme.accentText, fontWeight: '700' }]}>
            {restart.isPending ? '⏳' : t('common.restart')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (selectedCluster) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => setSelectedCluster(null)} activeOpacity={0.7}>
            <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.appName, { color: theme.text }]} numberOfLines={1}>{shortName(selectedCluster)}</Text>
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
            refreshing={servicesRefetch || false}
            onRefresh={refetchServices}
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
          refreshing={clustersRefetch || false}
          onRefresh={refetchClusters}
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

function TaskDefView({ taskDefArn, onBack }: { taskDefArn: string; onBack: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: taskDef, isLoading } = useTaskDefinition(taskDefArn);

  return (
    <View style={[taskStyles.container, { backgroundColor: theme.bg }]}>
      <View style={[taskStyles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[taskStyles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[taskStyles.title, { color: theme.text }]} numberOfLines={1}>
          {taskDef?.family || taskDefArn.split('/').pop()}
        </Text>
        <View style={{ width: 60 }} />
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 100 }} />
      ) : (
        <ScrollView horizontal style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={taskStyles.codeContent}>
            <Text style={[taskStyles.code, { color: theme.text }]} selectable>
              {JSON.stringify(taskDef
                ? {
                    family: taskDef.family,
                    revision: taskDef.revision,
                    status: taskDef.status,
                    networkMode: taskDef.networkMode,
                    cpu: taskDef.cpu,
                    memory: taskDef.memory,
                    requiresCompatibilities: taskDef.requiresCompatibilities,
                    executionRoleArn: taskDef.executionRoleArn,
                    taskRoleArn: taskDef.taskRoleArn,
                    containerDefinitions: taskDef.containerDefinitions?.map((c: any) => ({
                      name: c.name,
                      image: c.image,
                      cpu: c.cpu,
                      memory: c.memory,
                      memoryReservation: c.memoryReservation,
                      essential: c.essential,
                      portMappings: c.portMappings,
                      environment: c.environment,
                      logConfiguration: c.logConfiguration,
                    })),
                    volumes: taskDef.volumes,
                    placementConstraints: taskDef.placementConstraints,
                  }
                : { loading: true }, null, 2)}
            </Text>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

const taskStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1 },
  backBtn: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  codeContent: { padding: 14 },
  code: { fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1 },
  backBtn: { fontSize: 15, fontWeight: '600' },
  appName: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  loader: { marginTop: 100 },
  list: { padding: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8, overflow: 'hidden',
  },
  rowAccent: { width: 4, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0 },
  rowContent: { flex: 1, padding: 16, paddingLeft: 18 },
  rowName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 11 },
  chevron: { fontSize: 22, fontWeight: '300', marginRight: 12 },
  svcCard: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
  svcHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  svcName: { fontSize: 15, fontWeight: '600', flex: 1 },
  svcStatus: { fontSize: 12, fontWeight: '700' },
  svcStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCol: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 11, marginBottom: 2 },
  statVal: { fontSize: 14, fontWeight: '600' },
  svcActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  actionText: { fontSize: 13, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15 },
});
