import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { signOut } from '@/services/auth/sts';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const region = useAuthStore((s) => s.region);

  const handleClearCache = () => {
    Alert.alert('', t('screens.settings.clearCacheSuccess'));
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
            signOut();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('screens.settings.region')}</Text>
        <Text style={styles.value}>{region}</Text>
        <Text style={styles.hint}>{t('screens.settings.regionHint')}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.btnSecondary} onPress={handleClearCache} activeOpacity={0.8}>
          <Text style={styles.btnSecondaryText}>{t('screens.settings.clearCache')}</Text>
        </TouchableOpacity>
      </View>

      {isSignedIn && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>{t('screens.settings.signOut')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 16 },
  section: { marginBottom: 24, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#8888aa', marginBottom: 12, textTransform: 'uppercase' },
  value: { fontSize: 16, color: '#ffffff', marginBottom: 4 },
  hint: { fontSize: 12, color: '#555566' },
  btnPrimary: { backgroundColor: '#FF9900', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  btnSecondary: { backgroundColor: '#2a2a3e', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
});
