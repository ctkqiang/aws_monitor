import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useDbStore, DbType, DbConnection } from '@/stores/dbStore';
import { Haptic } from '@/utils/haptics';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import { createLocalDatabase } from '@/services/db/local-sqlite-executor';

const TAG = 'AddDatabase';

const DB_TYPES: { key: DbType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'mysql', icon: 'server' },
  { key: 'postgresql', icon: 'logo-electron' },
  { key: 'questdb', icon: 'flash' },
  { key: 'sqlite', icon: 'file-tray-full' },
];

const DEFAULT_PORTS: Record<DbType, string> = {
  mysql: '3306',
  postgresql: '5432',
  questdb: '8812',
  sqlite: 'file',
};

interface Props {
  onBack: () => void;
  editConnection?: DbConnection;
}

export default function AddDatabaseScreen({ onBack, editConnection }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const addConnection = useDbStore((s) => s.addConnection);
  const updateConnection = useDbStore((s) => s.updateConnection);
  const removeConnection = useDbStore((s) => s.removeConnection);

  const [dbType, setDbType] = React.useState<DbType>(editConnection?.type || 'mysql');
  const [host, setHost] = React.useState(editConnection?.host || '');
  const [port, setPort] = React.useState(editConnection?.port || DEFAULT_PORTS['mysql']);
  const [dbName, setDbName] = React.useState(editConnection?.dbName || '');
  const [username, setUsername] = React.useState(editConnection?.username || '');
  const [password, setPassword] = React.useState(editConnection?.password || '');
  const [remark, setRemark] = React.useState(editConnection?.remark || '');
  const [showPass, setShowPass] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const isEditing = !!editConnection;

  const handleTypeChange = (type: DbType) => {
    setDbType(type);
    if (!editConnection) {
      setPort(DEFAULT_PORTS[type]);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (dbType !== 'sqlite' && !host.trim()) errs.host = t('db.host') + ' 必填';
    if (dbType !== 'sqlite' && !port.trim()) errs.port = t('db.port') + ' 必填';
    if (!dbName.trim()) errs.dbName = t('db.dbName') + ' 必填';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    Haptic.medium();

    const data = {
      type: dbType,
      host: host.trim(),
      port: port.trim(),
      dbName: dbName.trim(),
      username: username.trim(),
      password: password,
      remark: remark.trim(),
    };

    if (dbType === 'sqlite') {
      const result = await createLocalDatabase(dbName.trim());
      if (!result.success) {
        Alert.alert(t('common.error'), result.error || '创建数据库失败');
        return;
      }
    }

    if (isEditing) {
      updateConnection(editConnection.id, data);
      Logger.info(TAG, '连接已更新');
      Alert.alert('', t('db.editConnection') + ' - ' + t('common.success'));
    } else {
      addConnection(data);
      Logger.info(TAG, '连接已保存');
      Alert.alert('', t('db.addConnection') + ' - ' + t('common.success'));
    }
    onBack();
  };

  const handleDelete = () => {
    Alert.alert(t('db.deleteConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: () => {
          Haptic.warning();
          removeConnection(editConnection!.id);
          onBack();
        },
      },
    ]);
  };

  const isSqlite = dbType === 'sqlite';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack} accessibilityLabel={t('common.back')}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {isEditing ? t('db.editConnection') : t('db.addConnection')}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={[styles.section, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
            <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('db.dbType')}</Text>
            <View style={styles.typeRow}>
              {DB_TYPES.map((dt) => {
                const sel = dbType === dt.key;
                return (
                  <RipplePressable key={dt.key} onPress={() => handleTypeChange(dt.key)} accessibilityRole="radio" accessibilityState={{ selected: sel }}>
                    <View style={[
                      styles.typeChip,
                      { borderColor: sel ? theme.accent : theme.border },
                      sel && { backgroundColor: theme.accentLight },
                    ]}>
                      <Ionicons name={dt.icon} size={16} color={sel ? theme.accent : theme.textMuted} style={{ marginRight: SPACING.xs }} />
                      <Text style={[styles.typeText, { color: sel ? theme.accent : theme.textMuted }]}>
                        {t(`db.${dt.key}`)}
                      </Text>
                    </View>
                  </RipplePressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
            {!isSqlite && (
              <>
                <Field
                  label={t('db.host')} icon="globe" value={host} onChangeText={setHost}
                  placeholder={t('db.host') + ' (IP/域名)'} theme={theme} error={errors.host}
                  autoCapitalize="none" autoCorrect={false}
                />
                <Field
                  label={t('db.port')} icon="pulse" value={port} onChangeText={setPort}
                  placeholder="3306" theme={theme} error={errors.port}
                  keyboardType="number-pad"
                />
                <Field
                  label={t('db.dbName')} icon="folder" value={dbName} onChangeText={setDbName}
                  placeholder={t('db.dbName')} theme={theme} error={errors.dbName}
                  autoCapitalize="none"
                />
                <Field
                  label={t('common.username')} icon="person" value={username} onChangeText={setUsername}
                  placeholder="root" theme={theme}
                  autoCapitalize="none"
                />
              </>
            )}
            {isSqlite && (
              <Field
                label={t('db.dbName')} icon="file-tray-full" value={dbName} onChangeText={setDbName}
                placeholder="database.sqlite" theme={theme} error={errors.dbName}
                autoCapitalize="none"
              />
            )}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('db.password')}</Text>
              <View style={[styles.inputW, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={16} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={password} onChangeText={setPassword}
                  placeholder="••••••" placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showPass} autoCapitalize="none"
                />
                <RipplePressable onPress={() => setShowPass(!showPass)} haptic="none">
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                </RipplePressable>
              </View>
            </View>
            <Field
              label={t('db.remark')} icon="create" value={remark} onChangeText={setRemark}
              placeholder={t('db.remark')} theme={theme}
            />
          </View>

          <View style={styles.btnRow}>
            <RipplePressable onPress={handleSave} accessibilityRole="button" accessibilityLabel={t('db.save')}>
              <View style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
                <Ionicons name="save" size={18} color={theme.accentText} style={{ marginRight: SPACING.sm }} />
                <Text style={[styles.saveBtnText, { color: theme.accentText }]}>{t('db.save')}</Text>
              </View>
            </RipplePressable>

            {isEditing && (
              <RipplePressable onPress={handleDelete} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                <View style={[styles.delBtn, { backgroundColor: theme.danger + '14', borderColor: theme.danger + '30' }]}>
                  <Ionicons name="trash" size={18} color={theme.danger} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.delBtnText, { color: theme.danger }]}>{t('common.delete')}</Text>
                </View>
              </RipplePressable>
            )}
          </View>

          <View style={{ height: SPACING.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, icon, ...props }: { label: string; icon: keyof typeof Ionicons.glyphMap; theme: any; error?: string } & TextInput['props'] & { theme: any; error?: string }) {
  return (
    <View style={s.fieldGroup}>
      <Text style={[s.label, { color: props.theme.textLabel }]}>{label}</Text>
      <View style={[s.inputW, { backgroundColor: props.theme.bgInput, borderColor: props.error ? props.theme.danger : props.theme.border }]}>
        <Ionicons name={icon} size={16} color={props.error ? props.theme.danger : props.theme.textMuted} />
        <TextInput
          {...props}
          style={[s.input, { color: props.theme.text }]}
          placeholderTextColor={props.theme.placeholder}
        />
      </View>
      {props.error ? <Text style={[s.errText, { color: props.theme.danger }]}>{props.error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  fieldGroup: { marginBottom: SPACING.lg },
  label: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  inputW: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
  },
  input: { flex: 1, paddingVertical: SPACING.lg, fontSize: 15 },
  errText: { ...TYPOGRAPHY.monoSm, marginTop: SPACING.xs, paddingLeft: SPACING.xs },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { ...TYPOGRAPHY.bodyBold },
  title: { ...TYPOGRAPHY.title, fontSize: 15 },
  scroll: { padding: SPACING.lg },
  section: {
    marginBottom: SPACING.lg, borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  sectionTitle: { ...TYPOGRAPHY.label, marginBottom: SPACING.md },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  typeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg, borderWidth: 1.5,
  },
  typeText: { ...TYPOGRAPHY.bodyBold, fontSize: 14 },
  fieldGroup: { marginBottom: SPACING.lg },
  label: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  inputW: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
  },
  input: { flex: 1, paddingVertical: SPACING.lg, fontSize: 15 },
  btnRow: { gap: SPACING.md, marginTop: SPACING.md },
  saveBtn: {
    borderRadius: RADIUS.xl, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, ...SHADOWS.md,
  },
  saveBtnText: { ...TYPOGRAPHY.button },
  delBtn: {
    borderRadius: RADIUS.xl, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, borderWidth: StyleSheet.hairlineWidth,
  },
  delBtnText: { ...TYPOGRAPHY.bodyBold },
});
