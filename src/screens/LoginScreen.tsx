import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
  Image, Animated, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signInWithAws } from '@/services/auth/auth';
import { useLoginStore } from '@/stores/loginStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAccountsStore, StoredAccount } from '@/stores/accountsStore';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import AccountManagementScreen from './AccountManagementScreen';

const TAG = 'LoginScreen';

type RegionGroup = {
  key: string;
  regions: { code: string }[];
};

function buildRegionGroups(t: any): RegionGroup[] {
  return [
    { key: 'northAmerica', regions: [{ code: 'us-east-1' }, { code: 'us-east-2' }, { code: 'us-west-1' }, { code: 'us-west-2' }, { code: 'ca-central-1' }] },
    { key: 'southAmerica', regions: [{ code: 'sa-east-1' }] },
    { key: 'europe', regions: [{ code: 'eu-west-1' }, { code: 'eu-west-2' }, { code: 'eu-west-3' }, { code: 'eu-central-1' }, { code: 'eu-central-2' }, { code: 'eu-north-1' }, { code: 'eu-south-1' }, { code: 'eu-south-2' }] },
    { key: 'asiaPacific', regions: [{ code: 'ap-northeast-1' }, { code: 'ap-northeast-2' }, { code: 'ap-northeast-3' }, { code: 'ap-south-1' }, { code: 'ap-south-2' }, { code: 'ap-southeast-1' }, { code: 'ap-southeast-2' }, { code: 'ap-southeast-3' }, { code: 'ap-southeast-4' }, { code: 'ap-southeast-5' }, { code: 'ap-east-1' }] },
    { key: 'middleEast', regions: [{ code: 'me-south-1' }, { code: 'me-central-1' }] },
    { key: 'africa', regions: [{ code: 'af-south-1' }] },
  ];
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const savedParams = useLoginStore((st) => st.savedParams);
  const saveLogin = useLoginStore((st) => st.saveLogin);
  const accounts = useAccountsStore((s) => s.accounts);
  const getDecryptedSecret = useAccountsStore((s) => s.getDecryptedSecret);
  const regionOverride = useSettingsStore((s) => s.regionOverride);
  const setRegionOverride = useSettingsStore((s) => s.setRegionOverride);

  const [isLoading, setIsLoading] = React.useState(false);
  const [region, setRegion] = React.useState(savedParams?.region || regionOverride || 'us-east-1');
  const [accessKeyId, setAccessKeyId] = React.useState(savedParams?.accessKeyId || '');
  const [secretAccessKey, setSecretAccessKey] = React.useState('');
  const [showSecret, setShowSecret] = React.useState(false);
  const [showAccounts, setShowAccounts] = React.useState(false);
  const [showRegionPicker, setShowRegionPicker] = React.useState(false);

  const logoScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;

  const regionGroups = React.useMemo(() => buildRegionGroups(t), [t]);

  const getRegionLabel = (code: string) => {
    const label = t(`regions.${code}`, '');
    return label ? `${label} (${code})` : code;
  };

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const isFormValid = region.trim() && accessKeyId.trim() && secretAccessKey.trim();

  if (showAccounts) {
    return (
      <AccountManagementScreen
        onBack={() => setShowAccounts(false)}
        onSelect={(account) => {
          setRegion(account.region);
          setAccessKeyId(account.accessKeyId);
          setSecretAccessKey(account.secretAccessKey);
          setShowAccounts(false);
          Logger.info(TAG, '已选择账户用于登录', { region: account.region });
        }}
      />
    );
  }

  const handleSignIn = async () => {
    if (!isFormValid) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    Logger.info(TAG, '登录已启动', { region: region.trim() });
    setIsLoading(true);
    try {
      await signInWithAws({
        region: region.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      });
      saveLogin({ region: region.trim(), accessKeyId: accessKeyId.trim() });
      setRegionOverride(region.trim());
      Logger.info(TAG, '登录成功');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.signInFailed');
      Logger.logError(TAG, '登录失败', error);
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAccount = (account: StoredAccount) => {
    const secret = getDecryptedSecret(account.id);
    setRegion(account.region);
    setAccessKeyId(account.accessKeyId);
    setSecretAccessKey(secret);
    Logger.info(TAG, '快速切换账户', { id: account.id, region: account.region });
  };

  const renderAccountCard = (account: StoredAccount) => {
    const maskedKey = account.accessKeyId.substring(0, 8) + '••••' + account.accessKeyId.substring(account.accessKeyId.length - 4);
    const isActive = region === account.region && accessKeyId === account.accessKeyId;

    return (
      <RipplePressable key={account.id} onPress={() => handleSelectAccount(account)}>
        <View style={[
          styles.accountCard,
          { backgroundColor: isActive ? theme.accentLight : theme.bgCard, borderColor: isActive ? theme.accent : theme.border },
          SHADOWS.sm,
        ]}>
          <View style={styles.accountCardLeft}>
            <View style={[styles.accountAvatar, { backgroundColor: isActive ? theme.accent : theme.textMuted }]}>
              <Text style={styles.accountAvatarText}>{account.alias.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.accountCardInfo}>
              <Text style={[styles.accountCardName, { color: theme.text }]} numberOfLines={1}>{account.alias}</Text>
              <View style={styles.accountCardMeta}>
                <View style={[styles.accountRegionChip, { backgroundColor: theme.bgInput }]}>
                  <Ionicons name="globe-outline" size={10} color={theme.textMuted} style={{ marginRight: 3 }} />
                  <Text style={[styles.accountRegionText, { color: theme.textMuted }]}>{account.region}</Text>
                </View>
                <Text style={[styles.accountKeyText, { color: theme.textMuted }]}>{maskedKey}</Text>
              </View>
            </View>
          </View>
          {isActive && (
            <View style={styles.accountActiveBadge}>
              <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
            </View>
          )}
        </View>
      </RipplePressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Animated.View style={[
              styles.logoWrapper, { borderColor: theme.accent, backgroundColor: theme.accentLight },
              { transform: [{ scale: logoScale }] },
            ]}>
              <Image source={require('@/../assets/applogo.png')} style={styles.logo} resizeMode="contain" />
            </Animated.View>

            <Animated.Text style={[styles.appTitle, { color: theme.accent }, { opacity: contentOpacity }]}>
              AWSight
            </Animated.Text>
            <Animated.Text style={[styles.subtitle, { color: theme.textSecondary }, { opacity: contentOpacity }]}>
              {t('auth.signInPrompt')}
            </Animated.Text>
          </View>

          {accounts.length > 0 && (
            <Animated.View style={{ opacity: contentOpacity, marginBottom: SPACING.lg }}>
              <View style={styles.accountsSectionHeader}>
                <Ionicons name="people-outline" size={15} color={theme.accent} style={{ marginRight: SPACING.sm }} />
                <Text style={[styles.accountsSectionTitle, { color: theme.textLabel }]}>
                  {t('accounts.title')}
                </Text>
                <View style={{ flex: 1 }} />
                <RipplePressable onPress={() => setShowAccounts(true)}>
                  <View style={[styles.manageBtn, { backgroundColor: theme.btnSecondary }]}>
                    <Ionicons name="settings-outline" size={13} color={theme.btnSecondaryText} style={{ marginRight: 4 }} />
                    <Text style={[styles.manageBtnText, { color: theme.btnSecondaryText }]}>{t('accounts.manageBtn', { count: accounts.length })}</Text>
                  </View>
                </RipplePressable>
              </View>
              {accounts.map(renderAccountCard)}
            </Animated.View>
          )}

          <Animated.View style={[
            styles.form, { backgroundColor: theme.bgCard, borderColor: theme.border },
            { opacity: contentOpacity, transform: [{ translateY: contentSlide }] },
          ]}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.region')}</Text>
              <RipplePressable onPress={() => setShowRegionPicker(true)}>
                <View style={[styles.regionPicker, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                  <Ionicons name="globe-outline" size={16} color={theme.textMuted} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.regionPickerText, { color: theme.text }]} numberOfLines={1}>
                    {getRegionLabel(region)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </View>
              </RipplePressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.accessKeyId')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <Ionicons name="key-outline" size={16} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]} value={accessKeyId} onChangeText={setAccessKeyId}
                  placeholder="AKIA..." placeholderTextColor={theme.placeholder}
                  autoCapitalize="none" autoCorrect={false} accessibilityLabel="Access Key ID"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.secretAccessKey')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={16} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]} value={secretAccessKey} onChangeText={setSecretAccessKey}
                  placeholder="••••••••••••••••" placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showSecret} autoCapitalize="none" autoCorrect={false}
                  accessibilityLabel="Secret Access Key"
                />
                <TouchableOpacity onPress={() => setShowSecret(!showSecret)} activeOpacity={0.6}>
                  <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('auth.signingIn')}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.accent }, !isFormValid && styles.buttonDisabled]}
                onPress={handleSignIn} disabled={!isFormValid || isLoading} activeOpacity={0.8}
                accessibilityRole="button" accessibilityLabel={t('common.signIn')}
                accessibilityState={{ disabled: !isFormValid || isLoading }}
              >
                <Ionicons name="log-in" size={20} color={theme.accentText} style={{ marginRight: SPACING.sm }} />
                <Text style={[styles.buttonText, { color: theme.accentText }]}>{t('common.signIn')}</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {accounts.length === 0 && (
            <Animated.View style={{ opacity: contentOpacity, marginTop: SPACING.xl }}>
              <RipplePressable onPress={() => setShowAccounts(true)}>
                <View style={[styles.addAccountCta, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
                  <Ionicons name="add-circle-outline" size={22} color={theme.accent} style={{ marginRight: SPACING.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addAccountTitle, { color: theme.text }]}>{t('accounts.setupBtn')}</Text>
                    <Text style={[styles.addAccountSub, { color: theme.textMuted }]}>Save credentials for quick region switching</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </View>
              </RipplePressable>
            </Animated.View>
          )}

          <Animated.View style={[styles.footer, { opacity: contentOpacity }]}>
            <View style={styles.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                Your credentials are stored securely on your device
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showRegionPicker} animationType="fade" transparent onRequestClose={() => setShowRegionPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRegionPicker(false)}>
          <View style={[styles.regionModal, { backgroundColor: theme.bgCard }, SHADOWS.xl]}>
            <View style={[styles.regionModalHeader, { borderBottomColor: theme.border }]}>
              <Ionicons name="globe-outline" size={20} color={theme.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.regionModalTitle, { color: theme.text }]}>{t('regions.selectRegion')}</Text>
              <View style={{ flex: 1 }} />
              <RipplePressable onPress={() => setShowRegionPicker(false)}>
                <Ionicons name="close-circle" size={26} color={theme.textMuted} />
              </RipplePressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {regionGroups.map((group) => (
                <View key={group.key}>
                  <View style={[styles.regionGroupHeader, { backgroundColor: theme.bgInput, borderBottomColor: theme.border }]}>
                    <Text style={[styles.regionGroupTitle, { color: theme.textLabel }]}>
                      {t(`regions.${group.key}`)}
                    </Text>
                  </View>
                  {group.regions.map((r) => {
                    const isSelected = region === r.code;
                    return (
                      <RipplePressable key={r.code} onPress={() => { setRegion(r.code); setShowRegionPicker(false); }}>
                        <View style={[styles.regionItem, { borderBottomColor: theme.border }, isSelected && { backgroundColor: theme.accentLight }]}>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={isSelected ? theme.accent : theme.textMuted}
                            style={{ marginRight: SPACING.md }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.regionName, { color: theme.text }]}>
                              {t(`regions.${r.code}`, r.code)}
                            </Text>
                            <Text style={[styles.regionCode, { color: theme.textMuted }]}>{r.code}</Text>
                          </View>
                          {isSelected && <Ionicons name="checkmark" size={18} color={theme.accent} />}
                        </View>
                      </RipplePressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  logoWrapper: {
    width: 100, height: 100, borderRadius: 24, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xxl, ...SHADOWS.lg,
  },
  logo: { width: 64, height: 64 },
  appTitle: { ...TYPOGRAPHY.h1, marginBottom: SPACING.sm },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center' },
  accountsSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs,
  },
  accountsSectionTitle: { ...TYPOGRAPHY.label },
  manageBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  manageBtnText: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  accountCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md, marginBottom: SPACING.xs,
  },
  accountCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  accountAvatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  accountAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  accountCardInfo: { flex: 1 },
  accountCardName: { ...TYPOGRAPHY.bodyBold, marginBottom: 2 },
  accountCardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm },
  accountRegionChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.xs,
  },
  accountRegionText: { ...TYPOGRAPHY.monoSm },
  accountKeyText: { ...TYPOGRAPHY.monoSm },
  accountActiveBadge: { marginLeft: SPACING.sm },
  form: {
    width: '100%', borderRadius: RADIUS.xxl, borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.xxl, ...SHADOWS.md,
  },
  fieldGroup: { marginBottom: SPACING.lg },
  label: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  regionPicker: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.lg,
  },
  regionPickerText: { flex: 1, fontSize: 15, marginRight: SPACING.sm },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
  },
  input: { flex: 1, paddingVertical: SPACING.lg, fontSize: 15 },
  loadingContainer: { alignItems: 'center', marginTop: SPACING.xxxl, paddingVertical: SPACING.lg },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  button: {
    marginTop: SPACING.xxl, height: 56, borderRadius: RADIUS.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  buttonDisabled: { opacity: 0.35 },
  buttonText: { ...TYPOGRAPHY.button },
  footer: { alignItems: 'center', marginTop: SPACING.xxxl },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.lg },
  footerText: { ...TYPOGRAPHY.caption, flex: 1 },
  addAccountCta: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.lg,
  },
  addAccountTitle: { ...TYPOGRAPHY.bodyBold, marginBottom: 2 },
  addAccountSub: { ...TYPOGRAPHY.caption },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl,
  },
  regionModal: {
    width: '100%', maxWidth: 400, borderRadius: RADIUS.xxl, overflow: 'hidden',
  },
  regionModalHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.xl, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  regionModalTitle: { ...TYPOGRAPHY.title },
  regionGroupHeader: {
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  regionGroupTitle: { ...TYPOGRAPHY.label },
  regionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  regionName: { ...TYPOGRAPHY.bodyBold },
  regionCode: { ...TYPOGRAPHY.monoSm, marginTop: 2 },
});
