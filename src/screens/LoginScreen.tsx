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
          <View style={[styles.logoContainer, { borderColor: theme.accent }]}>
            <Image source={require('@/../assets/applogo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={[styles.title, { color: theme.accent }]}>AWSight</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('auth.signInPrompt')}</Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.region')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
              value={region} onChangeText={setRegion}
              placeholder="us-east-1" placeholderTextColor={theme.placeholder} autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.accessKeyId')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
              value={accessKeyId} onChangeText={setAccessKeyId}
              placeholder="AKIA..." placeholderTextColor={theme.placeholder} autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textLabel }]}>{t('auth.secretAccessKey')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
              value={secretAccessKey} onChangeText={setSecretAccessKey}
              placeholder="••••••••••••••••" placeholderTextColor={theme.placeholder}
              secureTextEntry autoCapitalize="none"
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 28 }} />
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
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 90, height: 90, borderRadius: 22, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  logo: { width: 60, height: 60 },
  title: { fontSize: 34, fontWeight: '800', marginBottom: 6, letterSpacing: -1 },
  subtitle: { fontSize: 13, fontWeight: '500' },
  form: {
    width: '100%', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    padding: 20, paddingTop: 10,
  },
  fieldGroup: { marginTop: 14 },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    borderRadius: 10, padding: 15, fontSize: 15, borderWidth: StyleSheet.hairlineWidth,
  },
  button: {
    marginTop: 28, height: 54, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.35 },
  buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
