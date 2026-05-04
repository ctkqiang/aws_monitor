import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useRepositories, useImages } from '@/hooks/useECR';
import { Logger } from '@/utils/logger';

export default function ECRReposScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: repos, isLoading, isRefetching, error, refetch } = useRepositories();
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null);

  if (selectedRepo) {
    return <ECRImageDetail repoName={selectedRepo} onBack={() => setSelectedRepo(null)} />;
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
      onPress={() => {
        Logger.info('UI', 'ECR repo tapped', { name: item.repositoryName });
        setSelectedRepo(item.repositoryName);
      }}
      activeOpacity={0.6}
    >
      <View style={[styles.rowAccent, { backgroundColor: theme.accent }]} />
      <View style={styles.rowContent}>
        <Text style={[styles.name, { color: theme.text }]}>{item.repositoryName}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {item.createdAt ? `Created ${new Date(item.createdAt).toLocaleDateString()}` : ''}
          </Text>
          {item.imageTagMutability && (
            <View style={[styles.miniChip, { borderColor: theme.border }]}>
              <Text style={[styles.miniChipText, { color: theme.textSecondary }]}>{item.imageTagMutability}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: '#e74c3c' }]}>{(error as any)?.message || t('common.error')}</Text>
        </View>
      ) : (
        <FlatList
          data={repos || []}
          keyExtractor={(item: any) => item.repositoryArn}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={isRefetching || false}
          onRefresh={refetch}
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
  const { data: images, isLoading, refetch, isRefetching } = useImages(repoName);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const renderImage = ({ item }: { item: any }) => (
    <View style={[styles.imgCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={[styles.imgAccent, { backgroundColor: theme.accent }]} />
      <View style={styles.imgContent}>
        <Text style={[styles.tag, { color: theme.accent }]}>
          {item.imageTags?.[0] || 'untagged'}
        </Text>
        <Text style={[styles.digest, { color: theme.textMuted }]} numberOfLines={1}>
          sha256:{item.imageDigest?.substring(7, 19)}...
        </Text>
        <View style={styles.imgStats}>
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: theme.text }]}>{formatSize(item.imageSizeInBytes)}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Size</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: theme.text }]}>
              {item.imagePushedAt ? new Date(item.imagePushedAt).toLocaleDateString() : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Pushed</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
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
          refreshing={isRefetching || false}
          onRefresh={refetch}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { fontSize: 15, fontWeight: '600' },
  imgTitle: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  loader: { marginTop: 100 },
  list: { padding: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8, overflow: 'hidden',
  },
  rowAccent: { width: 4, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0 },
  rowContent: { flex: 1, padding: 16, paddingLeft: 18 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontSize: 12, marginRight: 8 },
  miniChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  miniChipText: { fontSize: 10, fontWeight: '600' },
  chevron: { fontSize: 22, fontWeight: '300', marginRight: 12 },
  imgCard: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8, overflow: 'hidden',
  },
  imgAccent: { height: 3 },
  imgContent: { padding: 16 },
  tag: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  digest: { fontSize: 11, fontFamily: 'monospace', marginBottom: 12 },
  imgStats: { flexDirection: 'row', alignItems: 'center' },
  statCell: { flex: 1, alignItems: 'center' },
  statDiv: { width: 1, height: 28, backgroundColor: 'rgba(128,128,160,0.15)' },
  statLabel: { fontSize: 10, marginTop: 2 },
  statVal: { fontSize: 15, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15 },
});
