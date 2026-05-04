import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useRepositories, useImages } from '@/hooks/useECR';

export default function ECRReposScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: repos, isLoading, error: reposError } = useRepositories();
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null);

  if (selectedRepo) {
    return <ECRImageDetail repoName={selectedRepo} onBack={() => setSelectedRepo(null)} />;
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
      onPress={() => setSelectedRepo(item.repositoryName)}
      activeOpacity={0.7}
    >
      <Text style={[styles.name, { color: theme.text }]}>{item.repositoryName}</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        {item.createdAt ? `Created ${new Date(item.createdAt).toLocaleDateString()}` : ''}
        {item.imageTagMutability ? ` · ${item.imageTagMutability}` : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : reposError ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: '#e74c3c' }]}>{(reposError as any)?.message || t('common.error')}</Text>
        </View>
      ) : (
        <FlatList
          data={repos || []}
          keyExtractor={(item: any) => item.repositoryArn}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.ecrRepos.noRepos')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function ECRImageDetail({ repoName, onBack }: { repoName: string; onBack: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: images, isLoading } = useImages(repoName);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const renderImage = ({ item }: { item: any }) => (
    <View style={[styles.imgCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={styles.imgHeader}>
        <Text style={[styles.tag, { color: theme.accent }]}>
          {item.imageTags?.[0] || 'untagged'}
        </Text>
        <Text style={[styles.digest, { color: theme.textMuted }]} numberOfLines={1}>
          {item.imageDigest?.substring(7, 19)}...
        </Text>
      </View>
      <View style={styles.imgStats}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: theme.textLabel }]}>Size</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{formatSize(item.imageSizeInBytes)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: theme.textLabel }]}>Pushed</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>
            {item.imagePushedAt ? new Date(item.imagePushedAt).toLocaleDateString() : '—'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backBtn, { color: theme.accent }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.imgTitle, { color: theme.text }]} numberOfLines={1}>{repoName}</Text>
        <View style={{ width: 60 }} />
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={images || []}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderImage}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.ecrRepos.noImages')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1 },
  backBtn: { fontSize: 15, fontWeight: '600' },
  imgTitle: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  loader: { marginTop: 100 },
  list: { padding: 12 },
  row: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 12 },
  imgCard: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  imgHeader: { marginBottom: 8 },
  tag: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  digest: { fontSize: 11, fontFamily: 'monospace' },
  imgStats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, marginBottom: 2 },
  statVal: { fontSize: 13, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15 },
});
