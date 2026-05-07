import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, FlatList, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Switch, TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import {
  useHealthStore, ServiceEndpoint, ServiceStatus, ServiceType,
  MIN_CHECK_INTERVAL,
} from '@/stores/healthStore';
import { runAllHealthChecks } from '@/services/healthMonitor';
import { Haptic } from '@/utils/haptics';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';

const TAG = 'HealthDashboard';

const SERVICE_TYPES: { key: ServiceType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'RDS', icon: 'server' },
  { key: 'PolarDB', icon: 'server' },
  { key: 'Valkey', icon: 'flash' },
  { key: 'Redis', icon: 'flash' },
  { key: 'MongoDB', icon: 'leaf' },
  { key: 'TimescaleDB', icon: 'time' },
  { key: 'DynamoDB', icon: 'cloud-done' },
  { key: 'Elasticsearch', icon: 'search' },
];

const STATUS_CONFIG: Record<ServiceStatus, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  healthy: { color: '#27ae60', icon: 'checkmark-circle', label: '正常' },
  degraded: { color: '#f39c12', icon: 'warning', label: '降级' },
  unhealthy: { color: '#e74c3c', icon: 'close-circle', label: '异常' },
  stopped: { color: '#95a5a6', icon: 'stop-circle', label: '已停止' },
  unknown: { color: '#7f8c8d', icon: 'help-circle', label: '未知' },
};

interface Props {
  onBack: () => void;
}

export default function HealthDashboardScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const services = useHealthStore((s) => s.services);
  const config = useHealthStore((s) => s.config);
  const addService = useHealthStore((s) => s.addService);
  const removeService = useHealthStore((s) => s.removeService);
  const toggleService = useHealthStore((s) => s.toggleService);
  const updateServiceConfig = useHealthStore((s) => s.updateServiceConfig);

  const [isRunning, setIsRunning] = React.useState(false);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showConfig, setShowConfig] = React.useState(false);
  const [configType, setConfigType] = React.useState<ServiceType>('RDS');
  const [newName, setNewName] = React.useState('');
  const [newType, setNewType] = React.useState<ServiceType>('RDS');
  const [newHost, setNewHost] = React.useState('');
  const [newPort, setNewPort] = React.useState('3306');
  const [editInterval, setEditInterval] = React.useState('30');

  const grouped = React.useMemo(() => {
    const map: Record<string, ServiceEndpoint[]> = {};
    for (const s of services) {
      if (!map[s.type]) map[s.type] = [];
      map[s.type].push(s);
    }
    return map;
  }, [services]);

  const runCheck = async () => {
    setIsRunning(true);
    Haptic.medium();
    try {
      await runAllHealthChecks();
    } catch (e) {
      Logger.logError(TAG, '健康检查执行失败', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAdd = () => {
    if (!newName.trim() || !newHost.trim() || !newPort.trim()) {
      Alert.alert('', '请填写所有必填字段');
      return;
    }
    Haptic.success();
    addService({ type: newType, name: newName.trim(), host: newHost.trim(), port: parseInt(newPort, 10) || 3306, enabled: true });
    setNewName('');
    setNewHost('');
    setNewPort('3306');
    setShowAdd(false);
  };

  const handleSaveConfig = () => {
    const interval = parseInt(editInterval, 10) * 1000;
    updateServiceConfig(configType, { intervalMs: interval });
    setShowConfig(false);
    Haptic.success();
  };

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const unhealthyCount = services.filter((s) => s.status === 'unhealthy').length;
  const totalCount = services.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <Text style={[styles.title, { color: theme.text }]}>服务健康监控</Text>
        <RipplePressable onPress={() => { setConfigType('RDS'); setEditInterval(String(Math.floor((config.RDS?.intervalMs || 30000) / 1000))); setShowConfig(true); }}>
          <View style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color={theme.textMuted} />
            <Text style={[styles.settingsBtnText, { color: theme.textMuted }]}>配置</Text>
          </View>
        </RipplePressable>
      </View>

      <View style={[styles.summaryBar, { backgroundColor: theme.bgCard, borderBottomColor: theme.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#27ae60' }]}>{healthyCount}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>正常</Text>
        </View>
        <View style={[styles.summaryDiv, { backgroundColor: theme.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#e74c3c' }]}>{unhealthyCount}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>异常</Text>
        </View>
        <View style={[styles.summaryDiv, { backgroundColor: theme.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: theme.text }]}>{totalCount}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>总计</Text>
        </View>
        <View style={{ flex: 1 }} />
        <RipplePressable onPress={runCheck} disabled={isRunning}>
          <View style={[styles.runBtn, { backgroundColor: theme.accent }]}>
            {isRunning ? (
              <ActivityIndicator size="small" color={theme.accentText} />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={theme.accentText} style={{ marginRight: SPACING.xs }} />
                <Text style={[styles.runBtnText, { color: theme.accentText }]}>检查</Text>
              </>
            )}
          </View>
        </RipplePressable>
      </View>

      <View style={styles.fabRow}>
        <RipplePressable onPress={() => setShowAdd(true)}>
          <View style={[styles.fab, { backgroundColor: theme.accent }]}>
            <Ionicons name="add" size={22} color={theme.accentText} />
          </View>
        </RipplePressable>
        <Text style={[styles.fabLabel, { color: theme.textMuted }]}>添加监控</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {Object.entries(grouped).map(([type, svcs]) => (
          <View key={type} style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <Ionicons
                name={SERVICE_TYPES.find((st) => st.key === type)?.icon || 'server'}
                size={14}
                color={theme.accent}
                style={{ marginRight: SPACING.sm }}
              />
              <Text style={[styles.groupTitle, { color: theme.accent }]}>{type}</Text>
              <View style={{ flex: 1 }} />
              <RipplePressable onPress={() => { setConfigType(type as ServiceType); setEditInterval(String(Math.floor((config[type as ServiceType]?.intervalMs || 30000) / 1000))); setShowConfig(true); }} haptic="light">
                <Text style={[styles.groupConfig, { color: theme.textMuted }]}>
                  {Math.floor((config[type as ServiceType]?.intervalMs || 30000) / 1000)}s
                </Text>
              </RipplePressable>
            </View>
            {svcs.map((svc) => {
              const st = STATUS_CONFIG[svc.status];
              return (
                <View key={svc.id} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }, SHADOWS.md]}>
                  <View style={styles.cardLeft}>
                    <Ionicons name={st.icon} size={22} color={st.color} style={{ marginRight: SPACING.md }} />
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardName, { color: theme.text }]}>{svc.name}</Text>
                      <Text style={[styles.cardMeta, { color: theme.textMuted }]}>
                        {svc.host}:{svc.port}
                        {svc.lastResponseMs !== null && `  ${svc.lastResponseMs}ms`}
                      </Text>
                      {svc.lastError && (
                        <Text style={[styles.cardError, { color: theme.danger }]} numberOfLines={1}>
                          {svc.lastError}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.statusBadge, { backgroundColor: st.color + '18' }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <Switch
                      value={svc.enabled}
                      onValueChange={() => { Haptic.selection(); toggleService(svc.id); }}
                      trackColor={{ false: theme.border, true: theme.accent + '60' }}
                      thumbColor={svc.enabled ? theme.accent : theme.textMuted}
                      style={{ marginLeft: SPACING.sm }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ))}
        {services.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="pulse-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>暂无监控服务</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>点击 + 添加服务</Text>
          </View>
        )}
        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>

      <Modal visible={showAdd} animationType="fade" transparent onRequestClose={() => setShowAdd(false)}>
        <RipplePressable style={styles.modalOverlay} onPress={() => setShowAdd(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.bgCard }, SHADOWS.xl]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>添加监控服务</Text>

            <Text style={[styles.fieldLabel, { color: theme.textLabel }]}>服务类型</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {SERVICE_TYPES.map((st) => {
                const sel = newType === st.key;
                return (
                  <RipplePressable key={st.key} onPress={() => setNewType(st.key)}>
                    <View style={[styles.typeChip, { borderColor: sel ? theme.accent : theme.border }, sel && { backgroundColor: theme.accentLight }]}>
                      <Ionicons name={st.icon} size={14} color={sel ? theme.accent : theme.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.typeChipText, { color: sel ? theme.accent : theme.textMuted }]}>{st.key}</Text>
                    </View>
                  </RipplePressable>
                );
              })}
            </ScrollView>

            <ModalField label="服务名称" icon="pricetag" value={newName} onChangeText={setNewName} placeholder="生产 RDS" theme={theme} />
            <ModalField label="主机地址" icon="globe" value={newHost} onChangeText={setNewHost} placeholder="192.168.1.100" theme={theme} autoCapitalize="none" />
            <ModalField label="端口" icon="pulse" value={newPort} onChangeText={setNewPort} placeholder="3306" theme={theme} keyboardType="number-pad" />

            <View style={styles.modalBtnRow}>
              <RipplePressable onPress={() => setShowAdd(false)}>
                <View style={[styles.modalCancelBtn, { borderColor: theme.border }]}>
                  <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>取消</Text>
                </View>
              </RipplePressable>
              <RipplePressable onPress={handleAdd}>
                <View style={[styles.modalAddBtn, { backgroundColor: theme.accent }]}>
                  <Ionicons name="add-circle" size={16} color={theme.accentText} style={{ marginRight: SPACING.xs }} />
                  <Text style={[styles.modalAddText, { color: theme.accentText }]}>添加</Text>
                </View>
              </RipplePressable>
            </View>
          </View>
        </RipplePressable>
      </Modal>

      <Modal visible={showConfig} animationType="fade" transparent onRequestClose={() => setShowConfig(false)}>
        <RipplePressable style={styles.modalOverlay} onPress={() => setShowConfig(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.bgCard }, SHADOWS.xl]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {configType} 检查配置
            </Text>
            <ModalField
              label="检查间隔（秒）"
              icon="timer"
              value={editInterval}
              onChangeText={setEditInterval}
              placeholder="30"
              theme={theme}
              keyboardType="number-pad"
            />
            <Text style={[styles.hintText, { color: theme.textMuted }]}>
              最小间隔 {MIN_CHECK_INTERVAL / 1000} 秒
            </Text>
            <View style={styles.modalBtnRow}>
              <RipplePressable onPress={() => setShowConfig(false)}>
                <View style={[styles.modalCancelBtn, { borderColor: theme.border }]}>
                  <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>取消</Text>
                </View>
              </RipplePressable>
              <RipplePressable onPress={handleSaveConfig}>
                <View style={[styles.modalAddBtn, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.modalAddText, { color: theme.accentText }]}>保存</Text>
                </View>
              </RipplePressable>
            </View>
          </View>
        </RipplePressable>
      </Modal>
    </SafeAreaView>
  );
}

function ModalField({ label, icon, ...props }: { label: string; icon: keyof typeof Ionicons.glyphMap; theme: any } & TextInput['props'] & { theme: any }) {
  return (
    <View style={mf.field}>
      <Text style={[mf.label, { color: props.theme.textLabel }]}>{label}</Text>
      <View style={[mf.inputW, { backgroundColor: props.theme.bgInput, borderColor: props.theme.border }]}>
        <Ionicons name={icon} size={16} color={props.theme.textMuted} />
        <TextInput {...props} style={[mf.input, { color: props.theme.text }]} placeholderTextColor={props.theme.placeholder} />
      </View>
    </View>
  );
}

const mf = StyleSheet.create({
  field: { marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  inputW: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
  },
  input: { flex: 1, paddingVertical: SPACING.md, fontSize: 15 },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { ...TYPOGRAPHY.bodyBold },
  title: { ...TYPOGRAPHY.title, fontSize: 15 },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryItem: { alignItems: 'center', marginRight: SPACING.xl },
  summaryVal: { ...TYPOGRAPHY.h2 },
  summaryLabel: { ...TYPOGRAPHY.monoSm, marginTop: 2 },
  summaryDiv: { width: 1, height: 28, marginRight: SPACING.xl },
  runBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  runBtnText: { ...TYPOGRAPHY.bodyBold, fontSize: 14 },
  fabRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  fab: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  fabLabel: { ...TYPOGRAPHY.caption, marginLeft: SPACING.sm },
  settingsBtn: { flexDirection: 'row', alignItems: 'center' },
  settingsBtnText: { ...TYPOGRAPHY.caption, marginLeft: 3 },
  scroll: { padding: SPACING.lg, paddingTop: SPACING.sm },
  groupSection: { marginBottom: SPACING.xl },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  groupTitle: { ...TYPOGRAPHY.label, fontWeight: '700' },
  groupConfig: { ...TYPOGRAPHY.monoSm },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md, marginBottom: SPACING.xs,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardInfo: { flex: 1 },
  cardName: { ...TYPOGRAPHY.bodyBold, marginBottom: 2 },
  cardMeta: { ...TYPOGRAPHY.monoSm },
  cardError: { ...TYPOGRAPHY.monoSm, marginTop: 2, fontSize: 10 },
  cardRight: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: {
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  statusText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  emptySub: { ...TYPOGRAPHY.caption, marginTop: SPACING.xs },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl,
  },
  modalContent: {
    width: '100%', maxWidth: 400, borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
  },
  modalTitle: { ...TYPOGRAPHY.title, marginBottom: SPACING.xl },
  fieldLabel: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  typeScroll: { marginBottom: SPACING.md },
  typeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg, borderWidth: 1.5, marginRight: SPACING.sm,
  },
  typeChipText: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  hintText: { ...TYPOGRAPHY.caption, marginBottom: SPACING.xl, marginTop: -SPACING.sm },
  modalBtnRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  modalCancelBtn: {
    flex: 1, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  modalCancelText: { ...TYPOGRAPHY.bodyBold },
  modalAddBtn: {
    flex: 2, borderRadius: RADIUS.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  modalAddText: { ...TYPOGRAPHY.button },
});
