import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { signInWithAmazon } from '@/services/auth/cognito';
import { isConfigValid } from '@/config/env';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);
  const configReady = isConfigValid();

  const handleSignIn = async () => {
    if (!configReady) {
      Alert.alert(t('common.error'), t('auth.configMissing'));
      return;
    }
    setIsLoading(true);
    try {
      await signInWithAmazon();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.signInFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>AWSight</Text>
        <Text style={styles.subtitle}>{t('auth.signInPrompt')}</Text>
      </View>

      <View style={styles.center}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#FF9900" />
        ) : (
          <TouchableOpacity
            style={[styles.button, !configReady && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={!configReady}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{t('common.signIn')}</Text>
          </TouchableOpacity>
        )}

        {!configReady && (
          <Text style={styles.warningText}>{t('auth.configMissing')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 60 },
  appName: { fontSize: 36, fontWeight: '700', color: '#FF9900', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#a0a0b0' },
  center: { alignItems: 'center' },
  button: {
    minWidth: 280, height: 52, borderRadius: 12,
    backgroundColor: '#FF9900', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
  warningText: { marginTop: 16, fontSize: 13, color: '#e74c3c', textAlign: 'center', paddingHorizontal: 24 },
});
