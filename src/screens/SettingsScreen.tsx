import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { signOut } from '@/services/auth/auth';
import { useAuthStore } from '@/stores/authStore';
import { useLoginStore } from '@/stores/loginStore';
import { useTheme, setThemeMode, useResolvedThemeMode, useThemeMode } from '@/theme/ThemeContext';
import DebugLogScreen from './DebugLogScreen';

const THEME_OPTIONS: Array<{ mode: 'system' | 'light' | 'dark'; label: string; icon: string; desc: string }> = [
  { mode: 'system', label: 'System', icon: '🌓', desc: 'Follow device settings' },
  { mode: 'light', label: 'Light', icon: '☀️', desc: 'Always light' },
  { mode: 'dark', label: 'Dark', icon: '🌙', desc: 'Always dark' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const region = useAuthStore((s) => s.region);
  const resetLogin = useLoginStore((st) => st.resetLogin);
  const hasSavedCredentials = useLoginStore((st) => st.hasSavedCredentials);
  const themeMode = useThemeMode();
  const resolvedMode = useResolvedThemeMode();
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

  const handleThemeChange = (mode: 'system' | 'light' | 'dark') => {
    setThemeMode(mode);
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
        <Text style={[styles.hint, { color: theme.placeholder, marginBottom: 12 }]}>
          Current: {resolvedMode === 'dark' ? 'Dark' : 'Light'}
        </Text>
        {THEME_OPTIONS.map((opt) => {
          const isSelected = themeMode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[
                styles.themeRow,
                { borderColor: isSelected ? theme.accent : theme.border },
                isSelected && { backgroundColor: resolvedMode === 'dark' ? '#1f1f38' : '#fff8ec' },
              ]}
              onPress={() => handleThemeChange(opt.mode)}
              activeOpacity={0.7}
            >
              <View style={styles.themeInfo}>
                <Text style={[styles.themeIcon]}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.themeLabel, { color: theme.text }]}>{opt.label}</Text>
                  <Text style={[styles.themeDesc, { color: theme.textMuted }]}>{opt.desc}</Text>
                </View>
              </View>
              <View style={[styles.radio, { borderColor: theme.border }, isSelected && { borderColor: theme.accent, backgroundColor: theme.accent }]}>
                {isSelected && <Text style={styles.radioDot}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>Debug</Text>
        <TouchableOpacity style={[styles.btnSecondary, { backgroundColor: theme.btnSecondary }]} onPress={() => setShowDebug(true)} activeOpacity={0.8}>
          <Text style={[styles.btnSecondaryText, { color: theme.btnSecondaryText }]}>Developer Logs</Text>
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
  section: { marginBottom: 24, borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 12 },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 8,
  },
  themeInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  themeIcon: { fontSize: 22, marginRight: 12 },
  themeLabel: { fontSize: 15, fontWeight: '600' },
  themeDesc: { fontSize: 12, marginTop: 2 },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { fontSize: 12, color: '#ffffff', fontWeight: '700' },
  btnPrimary: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '600' },
  btnSecondary: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnSecondaryText: { fontSize: 15, fontWeight: '600' },
});
