import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { signOut } from '@/services/auth/auth';
import { useAuthStore } from '@/stores/authStore';
import { useLoginStore } from '@/stores/loginStore';
import { useTheme, setThemeMode, getThemeMode } from '@/theme/ThemeContext';
import DebugLogScreen from './DebugLogScreen';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const region = useAuthStore((s) => s.region);
  const resetLogin = useLoginStore((st) => st.resetLogin);
  const hasSavedCredentials = useLoginStore((st) => st.hasSavedCredentials);
  const [mode, setMode] = React.useState<string>(getThemeMode());
  const [showDebug, setShowDebug] = React.useState(false);

  if (showDebug) {
    return <DebugLogScreen onClose={() => setShowDebug(false)} />;
  }

  const handleClearCache = () => {
    Alert.alert('', t('screens.settings.clearCacheSuccess'));
  };

  const handleResetCredentials = () => {
    Alert.alert(
      t('common.confirm'),
      t('auth.resetConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            resetLogin();
            Alert.alert('', t('auth.resetDone'));
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      t('screens.settings.signOut'),
      t('screens.settings.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: signOut },
      ]
    );
  };

  const cycleTheme = () => {
    const modes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
    const current = getThemeMode();
    const idx = modes.indexOf(current);
    const next = modes[(idx + 1) % modes.length];
    setThemeMode(next);
    setMode(next);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('screens.settings.region')}</Text>
        <Text style={[styles.value, { color: theme.text }]}>{region}</Text>
        <Text style={[styles.hint, { color: theme.placeholder }]}>{t('screens.settings.regionHint')}</Text>
      </View>

      <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('auth.theme')}</Text>
        <TouchableOpacity style={[styles.btnSecondary, { backgroundColor: theme.btnSecondary }]} onPress={cycleTheme} activeOpacity={0.8}>
          <Text style={[styles.btnSecondaryText, { color: theme.btnSecondaryText }]}>
            {t('auth.themeMode')}: {mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>Debug</Text>
        <TouchableOpacity style={[styles.btnSecondary, { backgroundColor: theme.btnSecondary }]} onPress={() => setShowDebug(true)} activeOpacity={0.8}>
          <Text style={[styles.btnSecondaryText, { color: theme.btnSecondaryText }]}>📋 Developer Logs</Text>
        </TouchableOpacity>
      </View>

      {hasSavedCredentials && (
        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: theme.danger }]} onPress={handleResetCredentials} activeOpacity={0.8}>
            <Text style={[styles.btnPrimaryText, { color: '#ffffff' }]}>{t('auth.resetCredentials')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
        <TouchableOpacity style={[styles.btnSecondary, { backgroundColor: theme.btnSecondary }]} onPress={handleClearCache} activeOpacity={0.8}>
          <Text style={[styles.btnSecondaryText, { color: theme.btnSecondaryText }]}>{t('screens.settings.clearCache')}</Text>
        </TouchableOpacity>
      </View>

      {isSignedIn && (
        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: theme.accent }]} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={[styles.btnPrimaryText, { color: theme.accentText }]}>{t('screens.settings.signOut')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  section: { marginBottom: 24, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  value: { fontSize: 16, marginBottom: 4 },
  hint: { fontSize: 12 },
  btnPrimary: { borderRadius: 8, padding: 14, alignItems: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '600' },
  btnSecondary: { borderRadius: 8, padding: 14, alignItems: 'center' },
  btnSecondaryText: { fontSize: 15, fontWeight: '600' },
});
