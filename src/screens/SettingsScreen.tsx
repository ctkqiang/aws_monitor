import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Alert, ScrollView, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '@/services/auth/auth';
import { useAuthStore } from '@/stores/authStore';
import { useLoginStore } from '@/stores/loginStore';
import { useTheme, setThemeMode, useResolvedThemeMode, useThemeMode } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import DebugLogScreen from './DebugLogScreen';

const TAG = 'Settings';

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
    Logger.info(TAG, '缓存已清除');
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
            Logger.info(TAG, '凭证已重置');
            resetLogin();
            Alert.alert('', t('auth.resetDone'));
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      t('screens.settings.signOut'),
      t('screens.settings.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            Logger.info(TAG, '已请求退出登录');
            signOut();
          },
        },
      ],
    );
  };

  const handleThemeChange = (mode: 'system' | 'light' | 'dark') => {
    Logger.info(TAG, '主题已切换', { mode });
    setThemeMode(mode);
  };

  const handleOpenRepo = () => {
    Linking.openURL(REPO_URL).catch(() => {
      Alert.alert(t('common.error'), 'Unable to open link');
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      accessibilityRole="scrollbar"
    >
      <View style={[styles.section, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="globe-outline" size={16} color={theme.accent} style={{ marginRight: SPACING.sm }} />
          <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('screens.settings.region')}</Text>
        </View>
        <Text style={[styles.value, { color: theme.text }]}>{region}</Text>
        <Text style={[styles.hint, { color: theme.placeholder }]}>{t('screens.settings.regionHint')}</Text>
      </View>

      <View style={[styles.section, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="color-palette-outline" size={16} color={theme.accent} style={{ marginRight: SPACING.sm }} />
          <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('auth.theme')}</Text>
        </View>
        <Text style={[styles.hint, { color: theme.placeholder, marginBottom: SPACING.md }]}>
          {t('about.currentTheme')}: {resolvedMode === 'dark' ? '\u263E Dark' : '\u2600 Light'}
        </Text>
        {THEME_OPTIONS.map((opt) => {
          const isSelected = themeMode === opt.mode;
          return (
            <RipplePressable
              key={opt.mode}
              onPress={() => handleThemeChange(opt.mode)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${opt.label}: ${opt.desc}`}
            >
              <View
                style={[
                  styles.themeRow,
                  { borderColor: isSelected ? theme.accent : theme.border },
                  isSelected && { backgroundColor: resolvedMode === 'dark' ? '#1f1f38' : '#fff8ec' },
                ]}
              >
                <View style={styles.themeInfo}>
                  <Ionicons name={opt.icon} size={20} color={isSelected ? theme.accent : theme.textMuted} style={{ marginRight: SPACING.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.themeLabel, { color: theme.text }]}>{opt.label}</Text>
                    <Text style={[styles.themeDesc, { color: theme.textMuted }]}>{opt.desc}</Text>
                  </View>
                </View>
                <View style={[styles.radio, { borderColor: isSelected ? theme.accent : theme.border }, isSelected && { borderColor: theme.accent, backgroundColor: theme.accent }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={theme.accentText} />}
                </View>
              </View>
            </RipplePressable>
          );
        })}
      </View>

      <View style={[styles.section, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bug-outline" size={16} color={theme.accent} style={{ marginRight: SPACING.sm }} />
          <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('about.debug')}</Text>
        </View>
        <RipplePressable onPress={() => setShowDebug(true)} accessibilityRole="button" accessibilityLabel={t('about.debugLogs')}>
          <View style={[styles.btnSecondary, { backgroundColor: theme.btnSecondary }]}>
            <Ionicons name="bug" size={16} color={theme.btnSecondaryText} style={{ marginRight: SPACING.sm }} />
            <Text style={[styles.btnSecondaryText, { color: theme.btnSecondaryText }]}>{t('about.debugLogs')}</Text>
          </View>
        </RipplePressable>
      </View>

      {hasSavedCredentials && (
        <View style={[styles.section, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
          <RipplePressable onPress={handleResetCredentials} accessibilityRole="button" accessibilityLabel={t('auth.resetCredentials')}>
            <View style={[styles.btnDanger, { backgroundColor: theme.danger }]}>
              <Ionicons name="key-outline" size={16} color="#fff" style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.btnDangerText, { color: '#ffffff' }]}>{t('auth.resetCredentials')}</Text>
            </View>
          </RipplePressable>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trash-outline" size={16} color={theme.accent} style={{ marginRight: SPACING.sm }} />
          <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('screens.settings.clearCache')}</Text>
        </View>
        <RipplePressable onPress={handleClearCache} accessibilityRole="button" accessibilityLabel={t('screens.settings.clearCache')}>
          <View style={[styles.btnSecondary, { backgroundColor: theme.btnSecondary }]}>
            <Text style={[styles.btnSecondaryText, { color: theme.btnSecondaryText }]}>{t('screens.settings.clearCache')}</Text>
          </View>
        </RipplePressable>
      </View>

      {isSignedIn && (
        <View style={[styles.section, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
          <RipplePressable onPress={handleSignOut} accessibilityRole="button" accessibilityLabel={t('screens.settings.signOut')}>
            <View style={[styles.btnPrimary, { backgroundColor: theme.accent }]}>
              <Ionicons name="log-out-outline" size={16} color={theme.accentText} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.btnPrimaryText, { color: theme.accentText }]}>{t('screens.settings.signOut')}</Text>
            </View>
          </RipplePressable>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={16} color={theme.accent} style={{ marginRight: SPACING.sm }} />
          <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('about.title')}</Text>
        </View>

        <View style={[styles.aboutHeader, { borderBottomColor: theme.border }]}>
          <View style={[styles.aboutIconBox, { backgroundColor: theme.accent }]}>
            <Ionicons name="cloud-done" size={28} color="#ffffff" />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={[styles.aboutAppName, { color: theme.text }]}>AWSight</Text>
            <View style={styles.aboutBadgeRow}>
              <View style={[styles.openSourceBadge, { backgroundColor: resolvedMode === 'dark' ? '#1a3a1a' : '#e8f5e9' }]}>
                <Ionicons name="git-branch" size={11} color="#27ae60" />
                <Text style={styles.openSourceText}>{t('about.openSource')}</Text>
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
            <Text style={[styles.aboutLabel, { color: theme.textLabel }]}>{t('about.author')}</Text>
            <Text style={[styles.aboutVal, { color: theme.text }]}>ctkqiang 钟智强</Text>
          </View>
          <View style={styles.aboutRow}>
            <View style={styles.aboutRowIcon}>
              <Ionicons name="mail" size={16} color={theme.textMuted} />
            </View>
            <Text style={[styles.aboutLabel, { color: theme.textLabel }]}>{t('about.email')}</Text>
            <Text style={[styles.aboutVal, { color: theme.text }]}>johnmelodymel@qq.com</Text>
          </View>
          <View style={styles.aboutRow}>
            <View style={styles.aboutRowIcon}>
              <Ionicons name="chatbubbles" size={16} color={theme.textMuted} />
            </View>
            <Text style={[styles.aboutLabel, { color: theme.textLabel }]}>{t('about.wechat')}</Text>
            <Text style={[styles.aboutVal, { color: theme.text }]}>ctkqiang</Text>
          </View>
        </View>

        <RipplePressable onPress={handleOpenRepo} accessibilityRole="link" accessibilityLabel={t('about.tapToOpen')}>
          <View style={[styles.repoCard, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
            <Ionicons name="code-slash" size={18} color={theme.accent} style={{ marginRight: SPACING.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.repoLabel, { color: theme.text }]} numberOfLines={1}>
                {REPO_URL}
              </Text>
              <Text style={[styles.repoHint, { color: theme.textMuted }]}>
                {t('about.tapToOpen')}
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={theme.textMuted} />
          </View>
        </RipplePressable>
      </View>

      <View style={{ height: SPACING.huge }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.huge },
  section: {
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { ...TYPOGRAPHY.label },
  value: { ...TYPOGRAPHY.h3, marginBottom: SPACING.xs },
  hint: { ...TYPOGRAPHY.caption },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1.5, marginBottom: SPACING.sm,
  },
  themeInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  themeLabel: { ...TYPOGRAPHY.bodyBold },
  themeDesc: { ...TYPOGRAPHY.caption, marginTop: 2 },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimary: {
    borderRadius: RADIUS.lg, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { ...TYPOGRAPHY.button, fontSize: 15 },
  btnDanger: {
    borderRadius: RADIUS.lg, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  btnDangerText: { ...TYPOGRAPHY.button, fontSize: 15 },
  btnSecondary: {
    borderRadius: RADIUS.lg, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { ...TYPOGRAPHY.button, fontSize: 15 },
  aboutHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: SPACING.lg, marginBottom: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aboutIconBox: {
    width: 52, height: 52, borderRadius: RADIUS.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  aboutAppName: { ...TYPOGRAPHY.h2, marginBottom: SPACING.xs },
  aboutBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  openSourceBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.xs,
  },
  openSourceText: { ...TYPOGRAPHY.monoSm, fontWeight: '700', color: '#27ae60', marginLeft: 4 },
  versionBadge: {
    paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.xs,
  },
  versionBadgeText: { ...TYPOGRAPHY.monoSm, fontWeight: '700' },
  aboutBody: {},
  aboutRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,160,0.12)',
  },
  aboutRowIcon: { width: 28 },
  aboutLabel: { ...TYPOGRAPHY.caption, fontWeight: '600', width: 70 },
  aboutVal: { ...TYPOGRAPHY.caption, fontWeight: '500', flex: 1, textAlign: 'right' },
  repoCard: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  repoLabel: { ...TYPOGRAPHY.monoSm, marginBottom: 3 },
  repoHint: { ...TYPOGRAPHY.caption, fontSize: 11 },
});
