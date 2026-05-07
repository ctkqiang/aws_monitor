import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, TextInput, ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Image, Animated,
  Modal, Linking, Pressable,
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

const IAM_CREDENTIAL_HELP_URL = 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html';

type RegionGroup = { key: string; regions: { code: string }[] };

function buildRegionGroups(): RegionGroup[] {
  return [
    { key: 'northAmerica', regions: [{ code: 'us-east-1' }, { code: 'us-east-2' }, { code: 'us-west-1' }, { code: 'us-west-2' }, { code: 'ca-central-1' }] },
    { key: 'southAmerica', regions: [{ code: 'sa-east-1' }] },
    { key: 'europe', regions: [{ code: 'eu-west-1' }, { code: 'eu-west-2' }, { code: 'eu-west-3' }, { code: 'eu-central-1' }, { code: 'eu-central-2' }, { code: 'eu-north-1' }, { code: 'eu-south-1' }, { code: 'eu-south-2' }] },
    { key: 'asiaPacific', regions: [{ code: 'ap-northeast-1' }, { code: 'ap-northeast-2' }, { code: 'ap-northeast-3' }, { code: 'ap-south-1' }, { code: 'ap-south-2' }, { code: 'ap-southeast-1' }, { code: 'ap-southeast-2' }, { code: 'ap-southeast-3' }, { code: 'ap-southeast-4' }, { code: 'ap-southeast-5' }, { code: 'ap-east-1' }] },
    { key: 'middleEast', regions: [{ code: 'me-south-1' }, { code: 'me-central-1' }] },
    { key: 'africa', regions: [{ code: 'af-south-1' }] },
  ];
}

interface FieldErrors {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

function validateField(field: string, value: string, isEditingSecret?: boolean): string | undefined {
  const v = value.trim();
  switch (field) {
    case 'region':
      if (!v) return undefined;
      return undefined;
    case 'accessKeyId':
      if (!v) return undefined;
      if (v.length < 20) return '长度不足（至少 20 个字符）';
      if (v.length > 24) return '长度超出（最多 24 个字符）';
      return undefined;
    case 'secretAccessKey':
      if (!v && !isEditingSecret) return undefined;
      if (v && v.length < 16) return '长度不足（至少 16 个字符）';
      return undefined;
    default:
      return undefined;
  }
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
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  const logoScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;
  const errorShake = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const regionGroups = useMemo(() => buildRegionGroups(), []);

  const getRegionLabel = useCallback((code: string) => {
    const label = t(`regions.${code}`, '');
    return label ? `${label} (${code})` : code;
  }, [t]);

  const isFormValid = useMemo(() =>
    region.trim().length > 0 &&
    accessKeyId.trim().length >= 20 &&
    secretAccessKey.trim().length >= 16,
  [region, accessKeyId, secretAccessKey]);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (errorBanner) {
      Animated.sequence([
        Animated.timing(errorShake, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => setErrorBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorBanner]);

  const handleBlur = useCallback((field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[field as keyof FieldErrors] = err;
      else delete next[field as keyof FieldErrors];
      return next;
    });
  }, []);

  const handleChange = useCallback((field: string, value: string) => {
    const setters: Record<string, (v: string) => void> = {
      region: setRegion,
      accessKeyId: setAccessKeyId,
      secretAccessKey: setSecretAccessKey,
    };
    setters[field]?.(value);
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[field as keyof FieldErrors] = err;
        else delete next[field as keyof FieldErrors];
        return next;
      });
    }
  }, [touched]);

  const handleSelectAccount = useCallback((account: StoredAccount) => {
    const secret = getDecryptedSecret(account.id);
    setRegion(account.region);
    setAccessKeyId(account.accessKeyId);
    setSecretAccessKey(secret);
    setErrors({});
    setTouched({});
    Logger.info(TAG, '快速切换账户', { id: account.id, region: account.region });
  }, [getDecryptedSecret]);

  const handleForgotCredentials = useCallback(() => {
    Linking.openURL(IAM_CREDENTIAL_HELP_URL).catch(() => {
      Alert.alert('', '无法打开链接');
    });
  }, []);

  const renderAccountCard = useCallback((account: StoredAccount) => {
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
  }, [region, accessKeyId, theme, handleSelectAccount]);

  if (showAccounts) {
    return (
      <AccountManagementScreen
        onBack={() => setShowAccounts(false)}
        onSelect={(account) => {
          setRegion(account.region);
          setAccessKeyId(account.accessKeyId);
          setSecretAccessKey(account.secretAccessKey);
          setShowAccounts(false);
          setErrors({});
          setTouched({});
          Logger.info(TAG, '已选择账户用于登录', { region: account.region });
        }}
      />
    );
  }

  const handleSignIn = async () => {
    const allErrors: FieldErrors = {
      region: !region.trim() ? '请选择区域' : undefined,
      accessKeyId: !accessKeyId.trim() ? '请输入访问密钥 ID'
        : accessKeyId.trim().length < 20 ? '长度不足'
        : undefined,
      secretAccessKey: !secretAccessKey.trim() ? '请输入秘密访问密钥'
        : secretAccessKey.trim().length < 16 ? '长度不足'
        : undefined,
    };
    setErrors(allErrors);
    setTouched({ region: true, accessKeyId: true, secretAccessKey: true });

    const hasErrors = Object.values(allErrors).some(Boolean);
    if (hasErrors) return;

    Logger.info(TAG, '登录已启动', { region: region.trim() });
    setIsLoading(true);
    setErrorBanner(null);

    Animated.spring(buttonScale, { toValue: 0.96, tension: 200, friction: 10, useNativeDriver: true }).start();

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
      setErrorBanner(message);
      Animated.spring(buttonScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
    } finally {
      if (!errorBanner) {
        setIsLoading(false);
      }
      setTimeout(() => {
        setIsLoading(false);
        Animated.spring(buttonScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
      }, 300);
    }
  };

  const renderFieldError = (field: string) => {
    if (!errors[field as keyof FieldErrors]) return null;
    return (
      <Animated.View style={[styles.fieldError, { transform: [{ translateX: errorShake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-4, 0, 4] }) }] }]}>
        <Ionicons name="alert-circle" size={12} color={theme.danger} style={{ marginRight: 4 }} />
        <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{errors[field as keyof FieldErrors]}</Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          accessibilityRole="none"
        >
          <View style={styles.header}>
            <Animated.View style={[
              styles.logoWrapper,
              { borderColor: theme.accent, backgroundColor: theme.accentLight },
              { transform: [{ scale: logoScale }] },
              SHADOWS.glow,
            ]}>
              <Image source={require('@/../assets/applogo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="AWSight Logo" />
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
                <RipplePressable
                  onPress={() => setShowAccounts(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('accounts.manageBtn', { count: accounts.length })}
                >
                  <View style={[styles.manageBtn, { backgroundColor: theme.btnSecondary }]}>
                    <Ionicons name="settings-outline" size={13} color={theme.btnSecondaryText} style={{ marginRight: 4 }} />
                    <Text style={[styles.manageBtnText, { color: theme.btnSecondaryText }]}>
                      {t('accounts.manageBtn', { count: accounts.length })}
                    </Text>
                  </View>
                </RipplePressable>
              </View>
              {accounts.map(renderAccountCard)}
            </Animated.View>
          )}

          <Animated.View style={[
            styles.form,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
            { opacity: contentOpacity, transform: [{ translateY: contentSlide }] },
          ]}>
            {errorBanner && (
              <Animated.View style={[styles.errorBanner, { backgroundColor: theme.danger + '12', borderColor: theme.danger + '30' }, { transform: [{ translateX: errorShake }] }]}>
                <Ionicons name="warning-outline" size={18} color={theme.danger} style={{ marginRight: SPACING.sm }} />
                <Text style={[styles.errorBannerText, { color: theme.danger }]}>{errorBanner}</Text>
              </Animated.View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.region')}</Text>
              <RipplePressable onPress={() => setShowRegionPicker(true)} accessibilityRole="button" accessibilityLabel={`${t('auth.region')}: ${getRegionLabel(region)}`}>
                <View style={[
                  styles.regionPicker,
                  { backgroundColor: theme.bgInput, borderColor: errors.region && touched.region ? theme.danger : theme.border },
                ]}>
                  <Ionicons name="globe-outline" size={16} color={errors.region && touched.region ? theme.danger : theme.textMuted} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.regionPickerText, { color: theme.text }]} numberOfLines={1}>
                    {getRegionLabel(region)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </View>
              </RipplePressable>
              {renderFieldError('region')}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.accessKeyId')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: errors.accessKeyId && touched.accessKeyId ? theme.danger : theme.border }]}>
                <Ionicons name="key-outline" size={16} color={errors.accessKeyId && touched.accessKeyId ? theme.danger : theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={accessKeyId}
                  onChangeText={(v) => handleChange('accessKeyId', v)}
                  onBlur={() => handleBlur('accessKeyId', accessKeyId)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t('auth.accessKeyId')}
                  accessibilityState={{ disabled: isLoading }}
                  autoComplete="username"
                  textContentType="username"
                  importantForAutofill="yes"
                  maxLength={24}
                />
              </View>
              {renderFieldError('accessKeyId')}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.secretAccessKey')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: errors.secretAccessKey && touched.secretAccessKey ? theme.danger : theme.border }]}>
                <Ionicons name="lock-closed-outline" size={16} color={errors.secretAccessKey && touched.secretAccessKey ? theme.danger : theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={secretAccessKey}
                  onChangeText={(v) => handleChange('secretAccessKey', v)}
                  onBlur={() => handleBlur('secretAccessKey', secretAccessKey)}
                  placeholder="••••••••••••••••"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showSecret}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t('auth.secretAccessKey')}
                  accessibilityState={{ disabled: isLoading }}
                  autoComplete="current-password"
                  textContentType="password"
                  importantForAutofill="yes"
                />
                <Pressable
                  onPress={() => setShowSecret(!showSecret)}
                  accessibilityRole="button"
                  accessibilityLabel={showSecret ? '隐藏密码' : '显示密码'}
                  hitSlop={8}
                >
                  <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                </Pressable>
              </View>
              {renderFieldError('secretAccessKey')}
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel={t('auth.signingIn')}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('auth.signingIn')}</Text>
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <RipplePressable
                  onPress={handleSignIn}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.signIn')}
                  accessibilityState={{ disabled: !isFormValid || isLoading }}
                >
                  <View style={[
                    styles.button,
                    { backgroundColor: isFormValid ? theme.accent : theme.btnSecondary },
                    !isFormValid && styles.buttonDisabled,
                  ]}>
                    <Ionicons name="log-in" size={20} color={isFormValid ? theme.accentText : theme.btnSecondaryText} style={{ marginRight: SPACING.sm }} />
                    <Text style={[styles.buttonText, { color: isFormValid ? theme.accentText : theme.btnSecondaryText }]}>
                      {t('common.signIn')}
                    </Text>
                  </View>
                </RipplePressable>
              </Animated.View>
            )}

            <Pressable
              onPress={handleForgotCredentials}
              style={styles.forgotLink}
              accessibilityRole="link"
              accessibilityLabel="查看 AWS 访问密钥帮助文档"
            >
              <Text style={[styles.forgotText, { color: theme.textMuted }]}>
                {t('auth.accessKeyId')} 帮助文档
              </Text>
              <Ionicons name="open-outline" size={12} color={theme.textMuted} style={{ marginLeft: 4 }} />
            </Pressable>
          </Animated.View>

          {accounts.length === 0 && (
            <Animated.View style={{ opacity: contentOpacity, marginTop: SPACING.lg }}>
              <RipplePressable onPress={() => setShowAccounts(true)} accessibilityRole="button" accessibilityLabel={t('accounts.setupBtn')}>
                <View style={[styles.addAccountCta, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
                  <Ionicons name="add-circle-outline" size={22} color={theme.accent} style={{ marginRight: SPACING.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addAccountTitle, { color: theme.text }]}>{t('accounts.setupBtn')}</Text>
                    <Text style={[styles.addAccountSub, { color: theme.textMuted }]}>
                      保存凭证以便快速切换区域
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </View>
              </RipplePressable>
            </Animated.View>
          )}

          <Animated.View style={[styles.footer, { opacity: contentOpacity }]}>
            <View style={styles.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.success} />
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                凭证经加密后存储在本地设备
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showRegionPicker} animationType="fade" transparent onRequestClose={() => setShowRegionPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRegionPicker(false)}>
          <View style={[styles.regionModal, { backgroundColor: theme.bgCard }, SHADOWS.xl]}>
            <View style={[styles.regionModalHeader, { borderBottomColor: theme.border }]}>
              <Ionicons name="globe-outline" size={20} color={theme.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.regionModalTitle, { color: theme.text }]}>{t('regions.selectRegion')}</Text>
              <View style={{ flex: 1 }} />
              <RipplePressable onPress={() => setShowRegionPicker(false)} accessibilityRole="button" accessibilityLabel="关闭">
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
                      <RipplePressable key={r.code} onPress={() => { setRegion(r.code); setShowRegionPicker(false); handleBlur('region', r.code); }}>
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
        </Pressable>
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
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md, marginBottom: SPACING.lg,
  },
  errorBannerText: { ...TYPOGRAPHY.caption, flex: 1 },
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
  fieldError: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: SPACING.xs, paddingLeft: SPACING.xs,
  },
  fieldErrorText: { ...TYPOGRAPHY.monoSm, flex: 1 },
  loadingContainer: { alignItems: 'center', marginTop: SPACING.xxxl, paddingVertical: SPACING.lg },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  button: {
    marginTop: SPACING.xxl, height: 56, borderRadius: RADIUS.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...TYPOGRAPHY.button },
  forgotLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  forgotText: { ...TYPOGRAPHY.caption },
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
  regionModal: { width: '100%', maxWidth: 400, borderRadius: RADIUS.xxl, overflow: 'hidden' },
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
