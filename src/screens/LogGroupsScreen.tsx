import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useLogGroups } from '@/hooks/useCloudWatch';
import LogStreamsScreen from './LogStreamsScreen';

export default function LogGroupsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: groups, isLoading, error, refetch } = useLogGroups();
  const [search, setSearch] = React.useState('');
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);

  if (selectedGroup) {
    return <LogStreamsScreen logGroupName={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  const filtered = groups?.filter((g) =>
    g.logGroupName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
      onPress={() => setSelectedGroup(item.logGroupName)}
      activeOpacity={0.7}
    >
      <Text style={[styles.name, { color: theme.text }]}>{item.logGroupName}</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        {item.storedBytes ? `${(item.storedBytes / 1024 / 1024).toFixed(1)} MB` : ''}
        {item.retentionInDays ? ` · ${item.retentionInDays}d retention` : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
        placeholder={t('screens.logGroups.searchPlaceholder')}
        placeholderTextColor={theme.placeholder}
        value={search}
        onChangeText={setSearch}
      />
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('common.error')}</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.btn, { backgroundColor: theme.accent }]}>
            <Text style={[styles.btnText, { color: theme.accentText }]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.logGroupName || item.arn || ''}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.logGroups.noGroups')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInput: { margin: 12, padding: 12, borderRadius: 8, fontSize: 15, borderWidth: 1 },
  loader: { marginTop: 100 },
  list: { paddingHorizontal: 12 },
  row: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15, marginBottom: 12 },
  btn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  btnText: { fontSize: 14, fontWeight: '600' },
});
