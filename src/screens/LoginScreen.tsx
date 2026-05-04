import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
  Image,
} from 'react-native';
import { signInWithAws } from '@/services/auth/auth';
import { useLoginStore } from '@/stores/loginStore';
import { useTheme } from '@/theme/ThemeContext';

export default function LoginScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const savedParams = useLoginStore((st) => st.savedParams);
  const saveLogin = useLoginStore((st) => st.saveLogin);

  const [isLoading, setIsLoading] = React.useState(false);
  const [region, setRegion] = React.useState(savedParams?.region || 'us-east-1');
  const [accessKeyId, setAccessKeyId] = React.useState(savedParams?.accessKeyId || '');
  const [secretAccessKey, setSecretAccessKey] = React.useState('');

  const isFormValid = region.trim() && accessKeyId.trim() && secretAccessKey.trim();

  const handleSignIn = async () => {
    if (!isFormValid) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    setIsLoading(true);
    try {
      await signInWithAws({
        region: region.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      });
      saveLogin({ region: region.trim(), accessKeyId: accessKeyId.trim() });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.signInFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('@/../assets/applogo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: theme.accent }]}>AWSight</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('auth.signInPrompt')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.region')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
            value={region} onChangeText={setRegion}
            placeholder="us-east-1" placeholderTextColor={theme.placeholder} autoCapitalize="none"
          />

          <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.accessKeyId')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
            value={accessKeyId} onChangeText={setAccessKeyId}
            placeholder="AKIA..." placeholderTextColor={theme.placeholder} autoCapitalize="none"
          />

          <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.secretAccessKey')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
            value={secretAccessKey} onChangeText={setSecretAccessKey}
            placeholder="••••••••••••••••" placeholderTextColor={theme.placeholder}
            secureTextEntry autoCapitalize="none"
          />

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 32 }} />
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
            >
              <Text style={[styles.buttonText, { color: theme.accentText }]}>{t('common.signIn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 80, height: 80, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14 },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16, textTransform: 'uppercase' },
  input: { borderRadius: 8, padding: 14, fontSize: 15, borderWidth: 1 },
  button: { marginTop: 32, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
