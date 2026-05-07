import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useRepositories, useImages } from '@/hooks/useECR';
import { Logger } from '@/utils/logger';
import { SkeletonList } from '@/utils/animations';
import RipplePressable from '@/components/RipplePressable';

const TAG = 'ECR';

function RepoCard({ item, onPress, theme, index }: { item: any; onPress: () => void; theme: any; index: number }) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 320, delay: Math.min(index * 60, 500),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, delay: Math.min(index * 60, 500),
        tension: 120, friction: 14, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <RipplePressable onPress={onPress}>
        <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
          <View style={[styles.rowAccent, { backgroundColor: theme.accent }]} />
          <View style={styles.rowContent}>
            <View style={styles.rowHeader}>
              <Ionicons name="cube-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.name, { color: theme.text }]}>{item.repositoryName}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {item.createdAt ? `${new Date(item.createdAt).toLocaleDateString()}` : ''}
              </Text>
              {item.imageTagMutability && (
                <View style={[styles.miniChip, { backgroundColor: theme.bgInput }]}>
                  <Ionicons name={item.imageTagMutability === 'IMMUTABLE' ? 'lock-closed' : 'lock-open'} size={10} color={theme.textMuted} style={{ marginRight: 3 }} />
                  <Text style={[styles.miniChipText, { color: theme.textSecondary }]}>{item.imageTagMutability}</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} style={{ marginRight: SPACING.md }} />
        </View>
      </RipplePressable>
    </Animated.View>
  );
}

function ImageCard({ item, theme, index }: { item: any; theme: any; index: number }) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 320, delay: Math.min(index * 55, 500),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, delay: Math.min(index * 55, 500),
        tension: 140, friction: 12, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '\u2014';
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const tagName = item.imageTags?.[0];

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <View style={[styles.imgCard, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.md]}>
        <View style={[styles.imgAccent, { backgroundColor: theme.accent }]} />
        <View style={styles.imgContent}>
          <View style={styles.tagRow}>
            <Ionicons name="pricetag" size={14} color={theme.accent} style={{ marginRight: SPACING.xs }} />
            <Text style={[styles.tag, { color: theme.accent }]} numberOfLines={1}>
              {tagName || t('ecrDetail.untagged')}
            </Text>
          </View>
          <Text style={[styles.digest, { color: theme.textMuted }]} numberOfLines={1} selectable>
            sha256:{item.imageDigest?.substring(7, 19)}...
          </Text>
          <View style={styles.imgStats}>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: theme.text }]}>{formatSize(item.imageSizeInBytes)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('ecrDetail.size')}</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: theme.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: theme.text }]}>
                {item.imagePushedAt ? new Date(item.imagePushedAt).toLocaleDateString() : '\u2014'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('ecrDetail.pushed')}</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: theme.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: theme.text }]}>
                {item.imageTags?.length ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('ecrDetail.tags')}</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function ECRImageDetail({ repoName, onBack }: { repoName: string; onBack: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: images, isLoading, refetch, isRefetching } = useImages(repoName);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="cube" size={16} color={theme.accent} style={{ marginRight: SPACING.xs }} />
            <Text style={[styles.imgTitle, { color: theme.text }]} numberOfLines={1}>{repoName}</Text>
          </View>
          <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
            {images?.length || 0} images
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>
      {isLoading ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={images || []}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }: { item: any; index: number }) => (
            <ImageCard item={item} index={index} theme={theme} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching || false}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="images-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.ecrRepos.noImages')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

export default function ECRReposScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: repos, isLoading, isRefetching, error, refetch } = useRepositories();
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null);

  if (selectedRepo) {
    return <ECRImageDetail repoName={selectedRepo} onBack={() => setSelectedRepo(null)} />;
  }

  const handleTap = (repoName: string) => {
    Logger.info(TAG, '仓库已点击', {
      repo: repoName,
    });
    setSelectedRepo(repoName);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {isLoading ? (
        <SkeletonList count={6} />
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.danger }]}>{(error as any)?.message || t('common.error')}</Text>
          <RipplePressable onPress={() => refetch()}>
            <View style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="refresh" size={16} color={theme.accentText} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.retryText, { color: theme.accentText }]}>{t('common.retry')}</Text>
            </View>
          </RipplePressable>
        </View>
      ) : (
        <FlatList
          data={repos || []}
          keyExtractor={(item: any) => item.repositoryArn}
          renderItem={({ item, index }: { item: any; index: number }) => (
            <RepoCard item={item} index={index} theme={theme} onPress={() => handleTap(item.repositoryName)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching || false}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="cube-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('screens.ecrRepos.noRepos')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { ...TYPOGRAPHY.bodyBold },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  imgTitle: { ...TYPOGRAPHY.title },
  subtitleText: { ...TYPOGRAPHY.caption, marginTop: 2 },
  loader: { marginTop: 100 },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.sm, overflow: 'hidden',
  },
  rowAccent: { width: 4, alignSelf: 'stretch' },
  rowContent: { flex: 1, padding: SPACING.lg, paddingLeft: SPACING.md },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  name: { ...TYPOGRAPHY.bodyBold, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm },
  meta: { ...TYPOGRAPHY.caption },
  miniChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  miniChipText: { ...TYPOGRAPHY.monoSm },
  imgCard: {
    borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.sm, overflow: 'hidden',
  },
  imgAccent: { height: 3 },
  imgContent: { padding: SPACING.lg },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  tag: { ...TYPOGRAPHY.bodyBold },
  digest: { ...TYPOGRAPHY.monoSm, marginBottom: SPACING.md },
  imgStats: { flexDirection: 'row', alignItems: 'center' },
  statCell: { flex: 1, alignItems: 'center' },
  statDiv: { width: 1, height: 32 },
  statLabel: { ...TYPOGRAPHY.caption, marginTop: SPACING.xs },
  statVal: { ...TYPOGRAPHY.h3, fontSize: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxxl },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  errorText: { ...TYPOGRAPHY.body, textAlign: 'center', marginVertical: SPACING.md },
  retryBtn: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  retryText: { ...TYPOGRAPHY.bodyBold },
});
