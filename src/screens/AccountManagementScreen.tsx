import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Alert, StyleSheet, Animated, Modal, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useAccountsStore, StoredAccount, AccountFormData } from '@/stores/accountsStore';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';

const TAG = 'AccountManagement';

const COMMON_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1',
  'sa-east-1',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-central-2',
  'eu-north-1', 'eu-south-1', 'eu-south-2',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ap-south-1', 'ap-south-2',
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3', 'ap-southeast-4', 'ap-southeast-5',
  'ap-east-1',
  'me-south-1', 'me-central-1', 'af-south-1',
];

interface Props {
  onBack: () => void;
  onSelect?: (account: { region: string; accessKeyId: string; secretAccessKey: string }) => void;
}

export default function AccountManagementScreen({ onBack, onSelect }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const accounts = useAccountsStore((s) => s.accounts);
  const addAccount = useAccountsStore((s) => s.addAccount);
  const updateAccount = useAccountsStore((s) => s.updateAccount);
  const removeAccount = useAccountsStore((s) => s.removeAccount);
  const getDecryptedSecret = useAccountsStore((s) => s.getDecryptedSecret);

  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<AccountFormData>({
    alias: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '',
  });
  const [showSecret, setShowSecret] = React.useState(false);
  const [showRegionPicker, setShowRegionPicker] = React.useState(false);
  const [regionFilter, setRegionFilter] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const resetForm = () => {
    setFormData({ alias: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '' });
    setEditingId(null);
    setShowSecret(false);
    setValidationErrors({});
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.alias.trim()) errors.alias = 'Alias is required';
    if (!formData.region.trim()) errors.region = 'Region is required';
    if (!formData.accessKeyId.trim()) errors.accessKeyId = 'Access Key ID is required';
    if (!formData.accessKeyId.startsWith('AKIA')) errors.accessKeyId = 'Must start with AKIA';
    if (formData.accessKeyId.length < 20) errors.accessKeyId = 'Key too short (min 20 chars)';
    if (!editingId && !formData.secretAccessKey.trim()) errors.secretAccessKey = 'Secret Key is required';
    if (formData.secretAccessKey && formData.secretAccessKey.length < 16 && !editingId) errors.secretAccessKey = 'Key too short (min 16 chars)';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        updateAccount(editingId, formData);
        Logger.info(TAG, '账户已更新', { id: editingId });
        Alert.alert('', t('accounts.saved') || 'Account updated successfully');
      } else {
        addAccount(formData);
        Logger.info(TAG, '账户已创建');
        Alert.alert('', t('accounts.created') || 'Account saved successfully');
      }
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      Logger.logError(TAG, '保存失败', e);
      Alert.alert(t('common.error'), e?.message || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (account: StoredAccount) => {
    const secret = getDecryptedSecret(account.id);
    setFormData({
      alias: account.alias,
      region: account.region,
      accessKeyId: account.accessKeyId,
      secretAccessKey: secret,
    });
    setEditingId(account.id);
    setShowForm(true);
  };

  const handleDelete = (account: StoredAccount) => {
    Alert.alert(
      t('accounts.deleteConfirm', { name: account.alias }) || `Delete ${account.alias}?`,
      t('accounts.deleteWarning') || 'This action cannot be undone.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            removeAccount(account.id);
            Alert.alert('', t('accounts.deleted') || 'Account deleted');
          },
        },
      ],
    );
  };

  const handleSelect = (account: StoredAccount) => {
    const secret = getDecryptedSecret(account.id);
    Logger.info(TAG, '已选择账户用于登录', { id: account.id });
    onSelect?.({
      region: account.region,
      accessKeyId: account.accessKeyId,
      secretAccessKey: secret,
    });
  };

  const filteredRegions = COMMON_REGIONS.filter((r) =>
    r.toLowerCase().includes(regionFilter.toLowerCase()),
  );

  const renderAccountItem = ({ item, index }: { item: StoredAccount; index: number }) => {
    const maskedKey = item.accessKeyId.substring(0, 8) + '••••' + item.accessKeyId.substring(item.accessKeyId.length - 4);

    return (
      <Animated.View style={[
        styles.accountCard,
        { backgroundColor: theme.bgCard, borderColor: theme.border },
        SHADOWS.sm,
        { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}>
        <TouchableOpacity
          style={styles.accountCardInner}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.accountIcon, { backgroundColor: theme.accentLight }]}>
            <Ionicons name="person-circle-outline" size={28} color={theme.accent} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountAlias, { color: theme.text }]} numberOfLines={1}>
              {item.alias}
            </Text>
            <View style={styles.accountMeta}>
              <View style={[styles.accountChip, { backgroundColor: theme.bgInput }]}>
                <Ionicons name="globe-outline" size={10} color={theme.textMuted} style={{ marginRight: 3 }} />
                <Text style={[styles.chipText, { color: theme.textMuted }]}>{item.region}</Text>
              </View>
              <Text style={[styles.maskedKey, { color: theme.textMuted }]}>{maskedKey}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.accountActions}>
          <RipplePressable onPress={() => handleEdit(item)}>
            <View style={[styles.actionIcon, { backgroundColor: theme.btnSecondary }]}>
              <Ionicons name="create-outline" size={16} color={theme.btnSecondaryText} />
            </View>
          </RipplePressable>
          <RipplePressable onPress={() => handleDelete(item)}>
            <View style={[styles.actionIcon, { backgroundColor: theme.danger + '14' }]}>
              <Ionicons name="trash-outline" size={16} color={theme.danger} />
            </View>
          </RipplePressable>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('accounts.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccountItem}
        contentContainerStyle={[styles.list, accounts.length === 0 && styles.emptyList]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={56} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {t('accounts.emptyTitle')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              {t('accounts.emptySubtitle')}
            </Text>
          </View>
        }
      />

      {accounts.length > 0 && (
        <View style={styles.footerHint}>
          <Ionicons name="finger-print-outline" size={14} color={theme.textMuted} style={{ marginRight: SPACING.xs }} />
          <Text style={[styles.footerHintText, { color: theme.textMuted }]}>
            {t('accounts.selectHint')}
          </Text>
        </View>
      )}

      <View style={[styles.fabContainer, { paddingBottom: Math.max(16, 0) }]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }, SHADOWS.lg]}
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color={theme.accentText} />
        </TouchableOpacity>
      </View>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowForm(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.bgCard }, SHADOWS.xl]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingId ? t('accounts.editTitle') : t('accounts.addTitle')}
              </Text>
              <RipplePressable onPress={() => setShowForm(false)}>
                <Ionicons name="close-circle" size={26} color={theme.textMuted} />
              </RipplePressable>
            </View>

            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.textLabel }]}>{t('accounts.alias')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
                  value={formData.alias} onChangeText={(v) => setFormData({ ...formData, alias: v })}
                  placeholder="My AWS Account" placeholderTextColor={theme.placeholder}
                  autoCorrect={false}
                />
                {validationErrors.alias ? <Text style={styles.errorMsg}>{validationErrors.alias}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.region')}</Text>
                <TouchableOpacity
                  style={[styles.input, styles.pickerInput, { backgroundColor: theme.bgInput, borderColor: theme.border }]}
                  onPress={() => setShowRegionPicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="globe-outline" size={16} color={theme.textMuted} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.pickerText, { color: formData.region ? theme.text : theme.placeholder }]}>
                    {formData.region || t('auth.region')}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
                {validationErrors.region ? <Text style={styles.errorMsg}>{validationErrors.region}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.accessKeyId')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
                  value={formData.accessKeyId} onChangeText={(v) => setFormData({ ...formData, accessKeyId: v })}
                  placeholder="AKIA..." placeholderTextColor={theme.placeholder}
                  autoCapitalize="none" autoCorrect={false}
                />
                {validationErrors.accessKeyId ? <Text style={styles.errorMsg}>{validationErrors.accessKeyId}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.secretAccessKey')}</Text>
                <View style={[styles.inputRow, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                  <Ionicons name="lock-closed-outline" size={16} color={theme.textMuted} style={{ marginRight: SPACING.sm }} />
                  <TextInput
                    style={[styles.inputInner, { color: theme.text }]}
                    value={formData.secretAccessKey} onChangeText={(v) => setFormData({ ...formData, secretAccessKey: v })}
                    placeholder={editingId ? '(unchanged)' : '••••••••••••••••'} placeholderTextColor={theme.placeholder}
                    secureTextEntry={!showSecret}
                    autoCapitalize="none" autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowSecret(!showSecret)} activeOpacity={0.6}>
                    <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
                {validationErrors.secretAccessKey ? <Text style={styles.errorMsg}>{validationErrors.secretAccessKey}</Text> : null}
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formBtn, { backgroundColor: theme.btnSecondary }]}
                  onPress={() => setShowForm(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.formBtnText, { color: theme.btnSecondaryText }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formBtn, styles.formBtnPrimary, { backgroundColor: theme.accent }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={theme.accentText} />
                  ) : (
                    <Text style={[styles.formBtnText, { color: theme.accentText }]}>{t('common.save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showRegionPicker} animationType="fade" transparent onRequestClose={() => setShowRegionPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowRegionPicker(false)}>
          <View style={[styles.pickerModal, { backgroundColor: theme.bgCard }, SHADOWS.xl]}>
            <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>{t('regions.selectRegion')}</Text>
              <RipplePressable onPress={() => setShowRegionPicker(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </RipplePressable>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border, margin: SPACING.md }]}
              value={regionFilter}
              onChangeText={setRegionFilter}
              placeholder={t('common.search')}
              placeholderTextColor={theme.placeholder}
              autoCorrect={false}
            />
            <ScrollView style={{ maxHeight: 280 }}>
              {(regionFilter && !COMMON_REGIONS.includes(regionFilter) ? [regionFilter, ...filteredRegions] : filteredRegions).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.regionItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setFormData({ ...formData, region: r });
                    setShowRegionPicker(false);
                    setRegionFilter('');
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons name={formData.region === r ? 'radio-button-on' : 'radio-button-off'} size={18} color={theme.accent} style={{ marginRight: SPACING.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.regionText, { color: theme.text }]}>
                      {t(`regions.${r}`, r)}
                    </Text>
                    <Text style={[styles.regionCode, { color: theme.textMuted }]}>{r}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { ...TYPOGRAPHY.bodyBold },
  headerTitle: { ...TYPOGRAPHY.title },
  list: { padding: SPACING.md, paddingBottom: 120 },
  emptyList: { flex: 1, justifyContent: 'center' },
  accountCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.sm, padding: SPACING.lg,
  },
  accountCardInner: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  accountIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  accountInfo: { flex: 1 },
  accountAlias: { ...TYPOGRAPHY.bodyBold, marginBottom: SPACING.xs },
  accountMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm },
  accountChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  chipText: { ...TYPOGRAPHY.monoSm },
  maskedKey: { ...TYPOGRAPHY.monoSm },
  accountActions: { flexDirection: 'column', gap: SPACING.sm, marginLeft: SPACING.md },
  actionIcon: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    justifyContent: 'center', alignItems: 'center',
  },
  footerHint: {
    position: 'absolute', bottom: 80, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  footerHintText: { ...TYPOGRAPHY.caption },
  fabContainer: {
    position: 'absolute', bottom: 24, right: SPACING.xl,
  },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyContainer: { alignItems: 'center', padding: SPACING.xxxl },
  emptyTitle: { ...TYPOGRAPHY.h3, marginTop: SPACING.xl, textAlign: 'center' },
  emptySubtitle: { ...TYPOGRAPHY.body, marginTop: SPACING.sm, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.xl, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { ...TYPOGRAPHY.title },
  formScroll: { padding: SPACING.xl },
  fieldGroup: { marginBottom: SPACING.lg },
  label: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  input: {
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontSize: 15,
  },
  pickerInput: {
    flexDirection: 'row', alignItems: 'center',
  },
  pickerText: { flex: 1, fontSize: 15 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md,
  },
  inputInner: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: 15,
  },
  errorMsg: {
    ...TYPOGRAPHY.caption,
    color: '#e74c3c',
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  formActions: {
    flexDirection: 'row', gap: SPACING.md,
    marginTop: SPACING.xxl, marginBottom: SPACING.xxl,
  },
  formBtn: {
    flex: 1, height: 50, borderRadius: RADIUS.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  formBtnPrimary: { flex: 2 },
  formBtnText: { ...TYPOGRAPHY.button, fontSize: 15 },
  pickerModal: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.xl, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { ...TYPOGRAPHY.title },
  regionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  regionText: { ...TYPOGRAPHY.body, flex: 1 },
  regionCode: { ...TYPOGRAPHY.monoSm, marginTop: 2 },
});
