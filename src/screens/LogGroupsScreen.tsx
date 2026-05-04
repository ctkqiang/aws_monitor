import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export default function LogGroupsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [search, setSearch] = React.useState('');

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
        placeholder={t('screens.logGroups.searchPlaceholder')}
        placeholderTextColor={theme.placeholder}
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.logGroups.noGroups')}</Text>
        <Text style={[styles.hintText, { color: theme.placeholder }]}>{t('auth.signInPrompt')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInput: { margin: 12, padding: 12, borderRadius: 8, fontSize: 15, borderWidth: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, marginBottom: 8 },
  hintText: { fontSize: 13 },
});
