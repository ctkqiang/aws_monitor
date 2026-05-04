import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native';

export default function LogGroupsScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder={t('screens.logGroups.searchPlaceholder')}
        placeholderTextColor="#555566"
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('screens.logGroups.noGroups')}</Text>
        <Text style={styles.hintText}>{t('auth.signInPrompt')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  searchInput: {
    margin: 12, padding: 12, borderRadius: 8,
    backgroundColor: '#1a1a2e', color: '#ffffff',
    fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e',
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: '#666680', marginBottom: 8 },
  hintText: { fontSize: 13, color: '#555566' },
});
