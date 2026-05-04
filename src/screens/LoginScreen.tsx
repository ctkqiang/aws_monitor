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
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithAws } from '@/services/auth/sts';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);

  const [region, setRegion] = React.useState('us-east-1');
  const [accountId, setAccountId] = React.useState('');
  const [iamUsername, setIamUsername] = React.useState('');
  const [accessKeyId, setAccessKeyId] = React.useState('');
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
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.signInFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.appName}>AWSight</Text>
          <Text style={styles.subtitle}>{t('auth.signInPrompt')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.region')}</Text>
          <TextInput
            style={styles.input}
            value={region}
            onChangeText={setRegion}
            placeholder="us-east-1"
            placeholderTextColor="#555566"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('auth.accountId')}</Text>
          <TextInput
            style={styles.input}
            value={accountId}
            onChangeText={setAccountId}
            placeholder="123456789012"
            placeholderTextColor="#555566"
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t('auth.iamUsername')}</Text>
          <TextInput
            style={styles.input}
            value={iamUsername}
            onChangeText={setIamUsername}
            placeholder={t('auth.iamUsernamePlaceholder')}
            placeholderTextColor="#555566"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('auth.accessKeyId')}</Text>
          <TextInput
            style={styles.input}
            value={accessKeyId}
            onChangeText={setAccessKeyId}
            placeholder="AKIA..."
            placeholderTextColor="#555566"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('auth.secretAccessKey')}</Text>
          <TextInput
            style={styles.input}
            value={secretAccessKey}
            onChangeText={setSecretAccessKey}
            placeholder="••••••••••••••••"
            placeholderTextColor="#555566"
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('auth.mfaCode')}</Text>
          <TextInput
            style={styles.input}
            value={mfaCode}
            onChangeText={setMfaCode}
            placeholder="000000"
            placeholderTextColor="#555566"
            keyboardType="numeric"
            maxLength={6}
          />

          {isLoading ? (
            <ActivityIndicator size="large" color="#FF9900" style={styles.loader} />
          ) : (
            <TouchableOpacity
              style={[styles.button, !isFormValid && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{t('common.signIn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 36, fontWeight: '700', color: '#FF9900', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#a0a0b0' },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#8888aa', marginBottom: 6, marginTop: 12, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#0f0f1a',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  button: {
    marginTop: 24,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FF9900',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
  loader: { marginTop: 24 },
});
