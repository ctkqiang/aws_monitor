import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithAws } from '@/services/auth/sts';
import { useLoginStore } from '@/stores/loginStore';
import { useTheme } from '@/theme/ThemeContext';
import { makeStyles } from '@/theme/styles';

export default function LoginScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const s = makeStyles(theme);
  const savedParams = useLoginStore((st) => st.savedParams);
  const saveLogin = useLoginStore((st) => st.saveLogin);

  const [isLoading, setIsLoading] = React.useState(false);

  const [region, setRegion] = React.useState(savedParams?.region || 'us-east-1');
  const [accountId, setAccountId] = React.useState(savedParams?.accountId || '');
  const [iamUsername, setIamUsername] = React.useState(savedParams?.iamUsername || '');
  const [accessKeyId, setAccessKeyId] = React.useState(savedParams?.accessKeyId || '');
  const [secretAccessKey, setSecretAccessKey] = React.useState('');
  const [mfaCode, setMfaCode] = React.useState('');

  const isFormValid =
    region.trim() &&
    accountId.trim() &&
    iamUsername.trim() &&
    accessKeyId.trim() &&
    secretAccessKey.trim() &&
    mfaCode.trim() &&
    /^\d+$/.test(mfaCode) &&
    mfaCode.length === 6;

  const handleSignIn = async () => {
    if (!isFormValid) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    setIsLoading(true);
    try {
      await signInWithAws({
        region: region.trim(),
        accountId: accountId.trim(),
        iamUsername: iamUsername.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        mfaCode: mfaCode.trim(),
      });
      saveLogin({
        region: region.trim(),
        accountId: accountId.trim(),
        iamUsername: iamUsername.trim(),
        accessKeyId: accessKeyId.trim(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.signInFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scrollLogin} keyboardShouldPersistTaps="handled">
        <View style={s.headerCenter}>
          <Text style={[s.title, { color: theme.accent }]}>AWSight</Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>{t('auth.signInPrompt')}</Text>
        </View>

        <View style={{ width: '100%' }}>
          <Text style={[s.label, { color: theme.textLabel }]}>{t('auth.region')}</Text>
          <TextInput style={s.input(theme)} value={region} onChangeText={setRegion} placeholder="us-east-1" placeholderTextColor={theme.placeholder} autoCapitalize="none" />

          <Text style={[s.label, { color: theme.textLabel }]}>{t('auth.accountId')}</Text>
          <TextInput style={s.input(theme)} value={accountId} onChangeText={setAccountId} placeholder="123456789012" placeholderTextColor={theme.placeholder} keyboardType="numeric" />

          <Text style={[s.label, { color: theme.textLabel }]}>{t('auth.iamUsername')}</Text>
          <TextInput style={s.input(theme)} value={iamUsername} onChangeText={setIamUsername} placeholder={t('auth.iamUsernamePlaceholder')} placeholderTextColor={theme.placeholder} autoCapitalize="none" />

          <Text style={[s.label, { color: theme.textLabel }]}>{t('auth.accessKeyId')}</Text>
          <TextInput style={s.input(theme)} value={accessKeyId} onChangeText={setAccessKeyId} placeholder="AKIA..." placeholderTextColor={theme.placeholder} autoCapitalize="none" />

          <Text style={[s.label, { color: theme.textLabel }]}>{t('auth.secretAccessKey')}</Text>
          <TextInput style={s.input(theme)} value={secretAccessKey} onChangeText={setSecretAccessKey} placeholder="••••••••••••••••" placeholderTextColor={theme.placeholder} secureTextEntry autoCapitalize="none" />

          <Text style={[s.label, { color: theme.textLabel }]}>{t('auth.mfaCode')}</Text>
          <TextInput style={s.input(theme)} value={mfaCode} onChangeText={setMfaCode} placeholder="000000" placeholderTextColor={theme.placeholder} keyboardType="numeric" maxLength={6} />

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 24 }} />
          ) : (
            <TouchableOpacity
              style={[s.btnPrimary, (!isFormValid || isLoading) && { opacity: 0.4 }, { marginTop: 24, backgroundColor: theme.accent }]}
              onPress={handleSignIn}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}
            >
              <Text style={[s.btnPrimaryText, { color: theme.accentText }]}>{t('common.signIn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
