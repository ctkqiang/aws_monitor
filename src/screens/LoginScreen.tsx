import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
  Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signInWithAws } from '@/services/auth/auth';
import { useLoginStore } from '@/stores/loginStore';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { Logger } from '@/utils/logger';

const TAG = 'LoginScreen';

export default function LoginScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const savedParams = useLoginStore((st) => st.savedParams);
  const saveLogin = useLoginStore((st) => st.saveLogin);

  const [isLoading, setIsLoading] = React.useState(false);
  const [region, setRegion] = React.useState(savedParams?.region || 'us-east-1');
  const [accessKeyId, setAccessKeyId] = React.useState(savedParams?.accessKeyId || '');
  const [secretAccessKey, setSecretAccessKey] = React.useState('');
  const [showSecret, setShowSecret] = React.useState(false);

  const logoScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: (x: number) => x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x,
        }),
        Animated.spring(contentSlide, {
          toValue: 0,
          tension: 120,
          friction: 14,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const isFormValid = region.trim() && accessKeyId.trim() && secretAccessKey.trim();

  const handleSignIn = async () => {
    if (!isFormValid) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    Logger.info(TAG, 'Sign in initiated', { region: region.trim() });
    setIsLoading(true);
    try {
      await signInWithAws({
        region: region.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      });
      saveLogin({ region: region.trim(), accessKeyId: accessKeyId.trim() });
      Logger.info(TAG, 'Sign in successful');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.signInFailed');
      Logger.logError(TAG, 'Sign in failed', error);
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  const RegionIcon = () => (
    <Ionicons name="globe-outline" size={16} color={theme.textMuted} />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Animated.View style={[
              styles.logoWrapper,
              { borderColor: theme.accent, backgroundColor: theme.accentLight },
              { transform: [{ scale: logoScale }] },
            ]}>
              <Image
                source={require('@/../assets/applogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.Text style={[
              styles.appTitle,
              { color: theme.accent },
              { opacity: contentOpacity },
            ]}>
              AWSight
            </Animated.Text>
            <Animated.Text style={[
              styles.subtitle,
              { color: theme.textSecondary },
              { opacity: contentOpacity },
            ]}>
              {t('auth.signInPrompt')}
            </Animated.Text>
          </View>

          <Animated.View style={[
            styles.form,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
            { opacity: contentOpacity, transform: [{ translateY: contentSlide }] },
          ]}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.region')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <RegionIcon />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={region} onChangeText={setRegion}
                  placeholder="us-east-1" placeholderTextColor={theme.placeholder}
                  autoCapitalize="none" autoCorrect={false}
                  accessibilityLabel="AWS Region"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.accessKeyId')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <Ionicons name="key-outline" size={16} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={accessKeyId} onChangeText={setAccessKeyId}
                  placeholder="AKIA..." placeholderTextColor={theme.placeholder}
                  autoCapitalize="none" autoCorrect={false}
                  accessibilityLabel="Access Key ID"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.secretAccessKey')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={16} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={secretAccessKey} onChangeText={setSecretAccessKey}
                  placeholder="••••••••••••••••" placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showSecret}
                  autoCapitalize="none" autoCorrect={false}
                  accessibilityLabel="Secret Access Key"
                />
                <TouchableOpacity onPress={() => setShowSecret(!showSecret)} activeOpacity={0.6}>
                  <Ionicons
                    name={showSecret ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.textMuted }]}>
                  Verifying credentials...
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.accent },
                  !isFormValid && styles.buttonDisabled,
                ]}
                onPress={handleSignIn}
                disabled={!isFormValid || isLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                accessibilityState={{ disabled: !isFormValid || isLoading }}
              >
                <Ionicons name="log-in" size={20} color={theme.accentText} style={{ marginRight: SPACING.sm }} />
                <Text style={[styles.buttonText, { color: theme.accentText }]}>{t('common.signIn')}</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          <Animated.View style={[
            styles.footer,
            { opacity: contentOpacity },
          ]}>
            <View style={styles.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                Your credentials are stored securely on your device
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: SPACING.xxxl },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    ...SHADOWS.lg,
  },
  logo: { width: 64, height: 64 },
  appTitle: {
    ...TYPOGRAPHY.h1,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    borderRadius: RADIUS.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.xxl,
    ...SHADOWS.md,
  },
  fieldGroup: { marginBottom: SPACING.lg },
  label: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.lg,
    fontSize: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: SPACING.xxxl,
    paddingVertical: SPACING.lg,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.md,
  },
  button: {
    marginTop: SPACING.xxl,
    height: 56,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  buttonDisabled: { opacity: 0.35 },
  buttonText: {
    ...TYPOGRAPHY.button,
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xxxl,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
  },
});
