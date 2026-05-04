import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '@/services/auth/auth';
import { useAuthStore } from '@/stores/authStore';
import { useLoginStore } from '@/stores/loginStore';
import { useTheme, setThemeMode, useResolvedThemeMode, useThemeMode } from '@/theme/ThemeContext';
import DebugLogScreen from './DebugLogScreen';

const THEME_OPTIONS: Array<{ mode: 'system' | 'light' | 'dark'; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }> = [
  { mode: 'system', label: 'System', icon: 'contrast', desc: 'Follow device settings' },
  { mode: 'light', label: 'Light', icon: 'sunny', desc: 'Always light' },
  { mode: 'dark', label: 'Dark', icon: 'moon', desc: 'Always dark' },
];

const REPO_URL = 'https://gitcode.com/ctkqiang_sr/awsight.git';

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

  const handleOpenRepo = () => {
    Linking.openURL(REPO_URL).catch(() => {
      Alert.alert('Error', 'Unable to open link');
    });
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
                <Ionicons name={opt.icon} size={20} color={isSelected ? theme.accent : theme.textMuted} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.themeLabel, { color: theme.text }]}>{opt.label}</Text>
                  <Text style={[styles.themeDesc, { color: theme.textMuted }]}>{opt.desc}</Text>
                </View>
              </View>
              <View style={[styles.radio, { borderColor: theme.border }, isSelected && { borderColor: theme.accent, backgroundColor: theme.accent }]}>
                {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
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

      <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>About</Text>

        <View style={[styles.aboutHeader, { borderBottomColor: theme.border }]}>
          <View style={[styles.aboutIconBox, { backgroundColor: theme.accent }]}>
            <Ionicons name="cloud-done" size={28} color="#ffffff" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.aboutAppName, { color: theme.text }]}>AWSight</Text>
            <View style={styles.aboutBadgeRow}>
              <View style={[styles.openSourceBadge, { backgroundColor: resolvedMode === 'dark' ? '#1a3a1a' : '#e8f5e9' }]}>
                <Ionicons name="git-branch" size={11} color="#27ae60" />
                <Text style={styles.openSourceText}>Open Source</Text>
              </View>
              <View style={[styles.versionBadge, { backgroundColor: theme.btnSecondary }]}>
                <Text style={[styles.versionBadgeText, { color: theme.textSecondary }]}>v1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.aboutBody}>
          <View style={styles.aboutRow}>
            <View style={styles.aboutRowIcon}>
              <Ionicons name="person" size={16} color={theme.textMuted} />
            </View>
            <Text style={[styles.aboutLabel, { color: theme.textLabel }]}>Author</Text>
            <Text style={[styles.aboutVal, { color: theme.text }]}>ctkqiang 钟智强</Text>
          </View>
          <View style={styles.aboutRow}>
            <View style={styles.aboutRowIcon}>
              <Ionicons name="mail" size={16} color={theme.textMuted} />
            </View>
            <Text style={[styles.aboutLabel, { color: theme.textLabel }]}>Email</Text>
            <Text style={[styles.aboutVal, { color: theme.text }]}>johnmelodymel@qq.com</Text>
          </View>
          <View style={styles.aboutRow}>
            <View style={styles.aboutRowIcon}>
              <Ionicons name="chatbubbles" size={16} color={theme.textMuted} />
            </View>
            <Text style={[styles.aboutLabel, { color: theme.textLabel }]}>WeChat</Text>
            <Text style={[styles.aboutVal, { color: theme.text }]}>ctkqiang</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.repoCard, { backgroundColor: theme.bgInput, borderColor: theme.border }]}
          onPress={handleOpenRepo}
          activeOpacity={0.7}
        >
          <Ionicons name="code-slash" size={18} color={theme.accent} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.repoLabel, { color: theme.text }]} numberOfLines={1}>
              {REPO_URL}
            </Text>
            <Text style={[styles.repoHint, { color: theme.textMuted }]}>
              Tap to open repository
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24, borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 12 },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 8,
  },
  themeInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  themeLabel: { fontSize: 15, fontWeight: '600' },
  themeDesc: { fontSize: 12, marginTop: 2 },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimary: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '600' },
  btnSecondary: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnSecondaryText: { fontSize: 15, fontWeight: '600' },
  aboutHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 16, marginBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aboutIconBox: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  aboutAppName: { fontSize: 20, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  aboutBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openSourceBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  openSourceText: { fontSize: 10, fontWeight: '700', color: '#27ae60', marginLeft: 4 },
  versionBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  versionBadgeText: { fontSize: 10, fontWeight: '700' },
  aboutBody: {},
  aboutRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,160,0.12)',
  },
  aboutRowIcon: { width: 28 },
  aboutLabel: { fontSize: 13, fontWeight: '600', width: 70 },
  aboutVal: { fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  repoCard: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  repoLabel: { fontSize: 12, fontFamily: 'monospace', marginBottom: 3 },
  repoHint: { fontSize: 11 },
});
