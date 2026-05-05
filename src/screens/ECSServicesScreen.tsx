import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, ScrollView, Animated, RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useClusters, useServices, useRestartService } from '@/hooks/useECS';
import { useTaskDefinition } from '@/hooks/useECSTaskDef';
import { useUIStore } from '@/stores/uiStore';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import { pushBackHandler, popBackHandler } from './MainTabs';

const TAG = 'ECS';

const SectionHeader = ({ title, icon, theme }: { title: string; icon: string; theme: any }) => (
  <View style={[detailStyles.sectionHeader, { borderBottomColor: theme.border }]}>
    <Ionicons name={icon as any} size={14} color={theme.accent} style={{ marginRight: 8 }} />
    <Text style={[detailStyles.sectionTitle, { color: theme.textLabel }]}>{title}</Text>
  </View>
);

const DetailRow = ({ label, value, theme }: { label: string; value: any; theme: any }) => {
  const display = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <View style={detailStyles.detailRow}>
      <Text style={[detailStyles.detailLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[detailStyles.detailVal, { color: theme.text }]} selectable numberOfLines={3}>{display}</Text>
    </View>
  );
};

const StatusBadge = ({ status, theme }: { status: string; theme: any }) => {
  const isActive = status === 'ACTIVE';
  return (
    <View style={[detailStyles.badge, { backgroundColor: isActive ? 'rgba(39,174,96,0.15)' : 'rgba(231,76,60,0.15)' }]}>
      <View style={[detailStyles.badgeDot, { backgroundColor: isActive ? '#27ae60' : theme.danger }]} />
      <Text style={[detailStyles.badgeText, { color: isActive ? '#27ae60' : theme.danger }]}>{status}</Text>
    </View>
  );
};

function ServiceDetailView({ service, clusterArn, onBack }: { service: any; clusterArn: string; onBack: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, []);

  const deployments = service.deployments || [];
  const events = service.events || [];
  const loadBalancers = service.loadBalancers || [];
  const networkConfig = service.networkConfiguration?.awsvpcConfiguration;
  const deployCfg = service.deploymentConfiguration;

  return (
    <Animated.View style={[detailStyles.container, { backgroundColor: theme.bg, opacity: fadeAnim }]}>
      <View style={[detailStyles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <Text style={[detailStyles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
        </RipplePressable>
        <Text style={[detailStyles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {service.serviceName}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={detailStyles.scrollContent}>
        <View style={[detailStyles.heroCard, { backgroundColor: theme.bgCard }]}>
          <View style={detailStyles.heroTop}>
            <View>
              <Text style={[detailStyles.heroName, { color: theme.text }]}>{service.serviceName}</Text>
              <Text style={[detailStyles.heroArn, { color: theme.textMuted }]} numberOfLines={1}>{service.serviceArn}</Text>
            </View>
            <StatusBadge status={service.status} theme={theme} />
          </View>
          <View style={detailStyles.heroStats}>
            <View style={detailStyles.heroStat}>
              <Text style={[detailStyles.heroStatVal, { color: theme.text }]}>{service.desiredCount}</Text>
              <Text style={[detailStyles.heroStatLabel, { color: theme.textMuted }]}>{t('ecsDetail.desired')}</Text>
            </View>
            <View style={[detailStyles.statDivider, { backgroundColor: theme.border }]} />
            <View style={detailStyles.heroStat}>
              <Text style={[detailStyles.heroStatVal, { color: '#27ae60' }]}>{service.runningCount}</Text>
              <Text style={[detailStyles.heroStatLabel, { color: theme.textMuted }]}>{t('ecsDetail.running')}</Text>
            </View>
            <View style={[detailStyles.statDivider, { backgroundColor: theme.border }]} />
            <View style={detailStyles.heroStat}>
              <Text style={[detailStyles.heroStatVal, { color: theme.danger }]}>{service.pendingCount || 0}</Text>
              <Text style={[detailStyles.heroStatLabel, { color: theme.textMuted }]}>{t('ecsDetail.pending')}</Text>
            </View>
          </View>
        </View>

        <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
          <SectionHeader title={t('ecsDetail.configuration')} icon="settings-outline" theme={theme} />
          <DetailRow label={t('ecsDetail.launchType')} value={service.launchType} theme={theme} />
          <DetailRow label={t('ecsDetail.platformVersion')} value={service.platformVersion} theme={theme} />
          <DetailRow label={t('ecsDetail.taskDefinition')} value={service.taskDefinition?.split('/').pop()} theme={theme} />
          <DetailRow label={t('ecsDetail.schedulingStrategy')} value={service.schedulingStrategy} theme={theme} />
          <DetailRow label={t('ecsDetail.createdAt')} value={service.createdAt ? new Date(service.createdAt).toLocaleString() : ''} theme={theme} />
          <DetailRow label={t('ecsDetail.createdBy')} value={service.createdBy} theme={theme} />
          <DetailRow label={t('ecsDetail.enableExec')} value={service.enableExecuteCommand ? t('common.yes') : t('common.no')} theme={theme} />
          <DetailRow label={t('ecsDetail.propagateTags')} value={service.propagateTags} theme={theme} />
        </View>

        {deployCfg && (
          <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
            <SectionHeader title={t('ecsDetail.deploymentConfig')} icon="rocket-outline" theme={theme} />
            <DetailRow label={t('ecsDetail.minHealthy')} value={deployCfg.minimumHealthyPercent} theme={theme} />
            <DetailRow label={t('ecsDetail.maxPercent')} value={deployCfg.maximumPercent} theme={theme} />
            <DetailRow label={t('ecsDetail.circuitBreaker')} value={deployCfg.deploymentCircuitBreaker?.enable ? t('common.enabled') : t('common.disabled')} theme={theme} />
          </View>
        )}

        {deployments.length > 0 && (
          <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
            <SectionHeader title={`${t('ecsDetail.deployments')} (${deployments.length})`} icon="layers-outline" theme={theme} />
            {deployments.map((d: any, i: number) => (
              <View key={i} style={[detailStyles.subCard, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <View style={detailStyles.subCardHead}>
                  <Text style={[detailStyles.subCardTitle, { color: theme.text }]}>{d.id?.substring(0, 12)}...</Text>
                  <StatusBadge status={d.status} theme={theme} />
                </View>
                <DetailRow label={t('ecsDetail.taskDefinition')} value={d.taskDefinition?.split('/').pop()} theme={theme} />
                <DetailRow label={`${t('ecsDetail.desired')} / ${t('ecsDetail.running')} / ${t('ecsDetail.pending')}`} value={`${d.desiredCount} / ${d.runningCount} / ${d.pendingCount}`} theme={theme} />
                <DetailRow label={t('ecsDetail.failedTasks')} value={d.failedTasks} theme={theme} />
                <DetailRow label={t('ecsDetail.createdAt')} value={d.createdAt ? new Date(d.createdAt).toLocaleString() : ''} theme={theme} />
                <DetailRow label={t('ecsDetail.createdAt')} value={d.updatedAt ? new Date(d.updatedAt).toLocaleString() : ''} theme={theme} />
                {d.rolloutState && <DetailRow label={t('ecsDetail.rolloutState')} value={d.rolloutState} theme={theme} />}
              </View>
            ))}
          </View>
        )}

        {loadBalancers.length > 0 && (
          <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
            <SectionHeader title={t('ecsDetail.loadBalancers')} icon="git-network-outline" theme={theme} />
            {loadBalancers.map((lb: any, i: number) => (
              <View key={i} style={[detailStyles.subCard, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <DetailRow label={t('ecsDetail.targetGroupArn')} value={lb.targetGroupArn} theme={theme} />
                <DetailRow label={t('ecsDetail.containerName')} value={lb.containerName} theme={theme} />
                <DetailRow label={t('ecsDetail.containerPort')} value={lb.containerPort} theme={theme} />
              </View>
            ))}
          </View>
        )}

        {networkConfig && (
          <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
            <SectionHeader title={t('ecsDetail.networkConfig')} icon="globe-outline" theme={theme} />
            <DetailRow label={t('ecsDetail.assignPublicIp')} value={networkConfig.assignPublicIp} theme={theme} />
            <DetailRow label={t('ecsDetail.subnets')} value={networkConfig.subnets?.join(', ')} theme={theme} />
            <DetailRow label={t('ecsDetail.securityGroups')} value={networkConfig.securityGroups?.join(', ')} theme={theme} />
          </View>
        )}

        <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
          <SectionHeader title={t('ecsDetail.healthIam')} icon="shield-checkmark-outline" theme={theme} />
          <DetailRow label={t('ecsDetail.healthGrace')} value={service.healthCheckGracePeriodSeconds ? `${service.healthCheckGracePeriodSeconds}s` : ''} theme={theme} />
          <DetailRow label={t('ecsDetail.roleArn')} value={service.roleArn} theme={theme} />
        </View>

        {events.length > 0 && (
          <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
            <SectionHeader title={`${t('ecsDetail.events')} (${events.length})`} icon="newspaper-outline" theme={theme} />
            {events.slice(0, 20).map((evt: any, i: number) => (
              <View key={i} style={[detailStyles.eventItem, { borderBottomColor: theme.border }]}>
                <Text style={[detailStyles.eventDate, { color: theme.accent }]}>
                  {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : ''}
                </Text>
                <Text style={[detailStyles.eventMsg, { color: theme.textSecondary }]}>{evt.message}</Text>
              </View>
            ))}
          </View>
        )}

        {service.capacityProviderStrategy && service.capacityProviderStrategy.length > 0 && (
          <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
            <SectionHeader title={t('ecsDetail.capacityProviders')} icon="hardware-chip-outline" theme={theme} />
            {service.capacityProviderStrategy.map((cp: any, i: number) => (
              <View key={i} style={detailStyles.detailRow}>
                <Text style={[detailStyles.detailLabel, { color: theme.textMuted }]}>{cp.capacityProvider}</Text>
                <Text style={[detailStyles.detailVal, { color: theme.text }]}>Base: {cp.base} / Weight: {cp.weight}</Text>
              </View>
            ))}
          </View>
        )}

        {service.serviceRegistries && service.serviceRegistries.length > 0 && (
          <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
            <SectionHeader title={t('ecsDetail.serviceRegistries')} icon="book-outline" theme={theme} />
            {service.serviceRegistries.map((sr: any, i: number) => (
              <DetailRow key={i} label={sr.registryArn} value={`Port: ${sr.port || '—'}`} theme={theme} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

export default function ECSServicesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: clusters, isLoading: clustersLoading, isRefetching: clustersRefetch, error: clustersError, refetch: refetchClusters } = useClusters();
  const selectedCluster = useUIStore((s) => s.selectedCluster);
  const setSelectedCluster = useUIStore((s) => s.setSelectedCluster);
  const { data: services, isLoading: servicesLoading, isRefetching: servicesRefetch, error: servicesError, refetch: refetchServices } = useServices(selectedCluster);
  const restart = useRestartService();
  const [selectedTaskDef, setSelectedTaskDef] = React.useState<string | null>(null);
  const [selectedService, setSelectedService] = React.useState<any | null>(null);

  useEffect(() => {
    if (selectedCluster || selectedTaskDef || selectedService) {
      pushBackHandler(() => {
        if (selectedService) { setSelectedService(null); return true; }
        if (selectedTaskDef) { setSelectedTaskDef(null); return true; }
        if (selectedCluster) { setSelectedCluster(null); return true; }
        return false;
      });
      return () => popBackHandler();
    }
  }, [selectedCluster, selectedTaskDef, selectedService]);

  if (selectedService) {
    return <ServiceDetailView service={selectedService} clusterArn={selectedCluster || ''} onBack={() => setSelectedService(null)} />;
  }

  if (selectedTaskDef) {
    return <TaskDefView taskDefArn={selectedTaskDef} onBack={() => setSelectedTaskDef(null)} />;
  }

  const handleRestart = (service: any) => {
    if (!selectedCluster) return;

    const serviceName = service.serviceName;
    const runningCount = service.runningCount ?? 0;
    const desiredCount = service.desiredCount ?? 0;
    const taskDefShort = service.taskDefinition?.split('/').pop() || '';
    const isPending = restart.isPending;

    if (isPending) return;

    Alert.alert(
      t('screens.ecsServices.restartConfirm', { name: serviceName }),
      [
        t('ecsDetail.launchType', { defaultValue: 'Launch Type' }) + ': ' + (service.launchType || '—'),
        t('ecsDetail.taskDefinition') + ': ' + taskDefShort,
        'Running: ' + runningCount + ' / Desired: ' + desiredCount,
      ].join('\n'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.restart'),
          onPress: () => {
            restart.mutate(
              { clusterArn: selectedCluster, serviceName, service },
              {
                onSuccess: (result) => {
                  Alert.alert(
                    t('screens.ecsServices.restartSuccess'),
                    [
                      t('screens.ecsServices.restartDeploymentId') + ': ' + result.newDeploymentId,
                      t('ecsDetail.rolloutState') + ': ' + result.rolloutState,
                      t('screens.ecsServices.restartRefreshHint'),
                    ].join('\n'),
                    [{ text: 'OK' }],
                  );
                },
              },
            );
          },
        },
      ],
    );
  };

  const shortName = (arn: string) => arn.split('/').pop() || arn;

  const renderClusterItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
      onPress={() => {
        Logger.info('ECS', 'Cluster tapped', { arn: item });
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
    <TouchableOpacity
      style={[styles.svcCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
      onPress={() => {
        Logger.info('ECS', 'Service tapped', { name: item.serviceName, arn: item.serviceArn });
        setSelectedService(item);
      }}
      activeOpacity={0.6}
    >
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
        <View style={[styles.actionBtn, { backgroundColor: theme.btnSecondary }]}>
          <Text style={[styles.actionText, { color: theme.btnSecondaryText }]}>
            {(item.deployments || []).length} {t('ecsDetail.deploys')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, {
            backgroundColor: restart.isPending ? theme.btnSecondary : theme.accent,
            opacity: restart.isPending ? 0.6 : 1,
          }]}
          onPress={() => handleRestart(item)}
          disabled={restart.isPending}
          activeOpacity={0.8}
        >
          {restart.isPending && restart.variables?.serviceName === item.serviceName ? (
            <ActivityIndicator size="small" color={theme.accentText} />
          ) : (
            <Text style={[styles.actionText, { color: theme.accentText, fontWeight: '700' }]}>
              {t('common.restart')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
            refreshControl={<RefreshControl refreshing={servicesRefetch || false} onRefresh={refetchServices} tintColor={theme.accent} colors={[theme.accent]} />}
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
          refreshControl={<RefreshControl refreshing={clustersRefetch || false} onRefresh={refetchClusters} tintColor={theme.accent} colors={[theme.accent]} />}
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
                    family: taskDef.family, revision: taskDef.revision, status: taskDef.status,
                    networkMode: taskDef.networkMode, cpu: taskDef.cpu, memory: taskDef.memory,
                    requiresCompatibilities: taskDef.requiresCompatibilities,
                    executionRoleArn: taskDef.executionRoleArn, taskRoleArn: taskDef.taskRoleArn,
                    containerDefinitions: taskDef.containerDefinitions?.map((c: any) => ({
                      name: c.name, image: c.image, cpu: c.cpu, memory: c.memory,
                      memoryReservation: c.memoryReservation, essential: c.essential,
                      portMappings: c.portMappings, environment: c.environment,
                      logConfiguration: c.logConfiguration,
                    })),
                    volumes: taskDef.volumes, placementConstraints: taskDef.placementConstraints,
                  }
                : { loading: true }, null, 2)}
            </Text>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

const detailStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  scrollContent: { padding: 12, paddingBottom: 40 },
  heroCard: { borderRadius: 16, padding: 18, marginBottom: 12 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroName: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  heroArn: { fontSize: 11, fontFamily: 'monospace' },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 24, fontWeight: '800' },
  heroStatLabel: { fontSize: 10, marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 32 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  card: { borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 10, marginBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,160,0.08)',
  },
  detailLabel: { fontSize: 12, fontWeight: '600', flex: 1, marginRight: 8 },
  detailVal: { fontSize: 12, fontWeight: '500', flex: 2, textAlign: 'right' },
  subCard: { borderRadius: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  subCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subCardTitle: { fontSize: 13, fontWeight: '700' },
  eventItem: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  eventDate: { fontSize: 10, fontWeight: '600', marginBottom: 3 },
  eventMsg: { fontSize: 12, lineHeight: 17 },
});

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
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
