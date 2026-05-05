import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  Animated, TextInput, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useBuckets, useObjects } from '@/hooks/useS3';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';

const TAG = 'S3';

function BucketCard({ item, onPress, theme, index }: { item: any; onPress: () => void; theme: any; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 320, delay: Math.min(index * 55, 500), useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, delay: Math.min(index * 55, 500),
        tension: 120, friction: 14, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const createdDate = item.CreationDate ? new Date(item.CreationDate).toLocaleDateString() : '';

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <RipplePressable onPress={onPress}>
        <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.sm]}>
          <View style={[styles.rowAccent, { backgroundColor: theme.accent }]} />
          <View style={styles.rowContent}>
            <View style={styles.rowHeader}>
              <Ionicons name="cloud-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.Name}</Text>
            </View>
            <View style={styles.metaRow}>
              {createdDate ? (
                <View style={[styles.chip, { backgroundColor: theme.bgInput }]}>
                  <Ionicons name="time-outline" size={10} color={theme.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{createdDate}</Text>
                </View>
              ) : null}
              <Text style={[styles.regionTag, { color: theme.textMuted }]}>
                {item.BucketRegion || 'us-east-1'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} style={{ marginRight: SPACING.md }} />
        </View>
      </RipplePressable>
    </Animated.View>
  );
}

function ObjectCard({ item, onPress, theme, index }: { item: any; onPress?: () => void; theme: any; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 280, delay: Math.min(index * 25, 400), useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, delay: Math.min(index * 25, 400),
        tension: 140, friction: 15, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '\u2014';
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const formatDate = (d?: Date) => (d ? new Date(d).toLocaleString() : '');

  const keyParts = item.Key?.split('/') || [];
  const fileName = keyParts[keyParts.length - 1] || item.Key;
  const folderPath = keyParts.length > 1 ? keyParts.slice(0, -1).join('/') + '/' : '';

  const content = (
    <Animated.View style={[
      styles.objRow,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: theme.bgCard, borderColor: theme.border },
      SHADOWS.sm,
    ]}>
      <View style={[styles.objAccent, { backgroundColor: theme.accent }]} />
      <View style={styles.objContent}>
        <View style={styles.objHeader}>
          <Ionicons name="document-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.objName, { color: theme.text }]} numberOfLines={2}>
              {fileName}
            </Text>
            {folderPath ? (
              <Text style={[styles.objPath, { color: theme.textMuted }]} numberOfLines={1}>
                {folderPath}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.objMeta}>
          <View style={[styles.objChip, { backgroundColor: theme.bgInput }]}>
            <Text style={[styles.objChipText, { color: theme.textSecondary }]}>
              {item.StorageClass || 'STANDARD'}
            </Text>
          </View>
          <View style={[styles.objChip, { backgroundColor: theme.bgInput }]}>
            <Ionicons name="hardware-chip-outline" size={10} color={theme.textMuted} style={{ marginRight: 3 }} />
            <Text style={[styles.objChipText, { color: theme.textSecondary }]}>
              {formatSize(item.Size)}
            </Text>
          </View>
          <Text style={[styles.objDate, { color: theme.textMuted }]}>
            {formatDate(item.LastModified)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  return onPress ? <RipplePressable onPress={onPress}>{content}</RipplePressable> : content;
}

function ObjectListScreen({ bucketName, onBack }: { bucketName: string; onBack: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: objects, isLoading, isRefetching, error, refetch } = useObjects(bucketName);
  const [filter, setFilter] = React.useState('');
  const [selectedObject, setSelectedObject] = React.useState<any>(null);

  const filtered = React.useMemo(() => {
    if (!filter) return objects;
    return objects?.filter((o: any) => o.Key?.toLowerCase().includes(filter.toLowerCase()));
  }, [objects, filter]);

  if (selectedObject) {
    return <ObjectDetailView item={selectedObject} bucketName={bucketName} onBack={() => setSelectedObject(null)} />;
  }

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
            <Ionicons name="cloud" size={16} color={theme.accent} style={{ marginRight: SPACING.xs }} />
            <Text style={[styles.imgTitle, { color: theme.text }]} numberOfLines={1}>{bucketName}</Text>
          </View>
          <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
            {objects?.length || 0} {t('s3.objects')}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.filterRow}>
        <Ionicons name="search" size={15} color={theme.placeholder} style={{ marginRight: SPACING.sm }} />
        <TextInput
          style={[styles.filterInput, { color: theme.text }]}
          placeholder={t('s3.searchObjects')}
          placeholderTextColor={theme.placeholder}
          value={filter}
          onChangeText={setFilter}
          autoCorrect={false}
        />
        {filter.length > 0 && (
          <RipplePressable onPress={() => setFilter('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </RipplePressable>
        )}
      </View>

      {isLoading && !objects ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.danger }]}>
            {(error as any)?.message || t('common.error')}
          </Text>
          <RipplePressable onPress={() => refetch()}>
            <View style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="refresh" size={16} color={theme.accentText} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.retryText, { color: theme.accentText }]}>{t('common.retry')}</Text>
            </View>
          </RipplePressable>
        </View>
      ) : (
        <FlatList
          data={filtered || []}
          keyExtractor={(item: any) => item.Key || item.ETag || Math.random().toString()}
          renderItem={({ item, index }) => (
            <ObjectCard item={item} index={index} theme={theme} onPress={() => setSelectedObject(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || false}
              onRefresh={refetch}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
          ListFooterComponent={
            (objects && objects.length >= 2000) ? (
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                {t('s3.maxObjectsShown')}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="document-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {objects && objects.length === 0
                  ? t('s3.noObjects')
                  : filter ? t('common.noResults') : ''}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function ObjectDetailView({ item, bucketName, onBack }: { item: any; bucketName: string; onBack: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, []);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '\u2014';
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const formatDate = (d?: Date) => (d ? new Date(d).toLocaleString() : '');

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.bg, opacity: fadeAnim }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <Text style={[styles.imgTitle, { color: theme.text }]} numberOfLines={1}>Object Detail</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={detailStyles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[detailStyles.heroCard, { backgroundColor: theme.bgCard }, SHADOWS.md]}>
          <View style={detailStyles.heroTop}>
            <Ionicons name="document-outline" size={28} color={theme.accent} style={{ marginRight: SPACING.md }} />
            <View style={{ flex: 1 }}>
              <Text style={[detailStyles.heroName, { color: theme.text }]} numberOfLines={3}>
                {item.Key?.split('/').pop() || item.Key}
              </Text>
              <Text style={[detailStyles.heroPath, { color: theme.textMuted }]} numberOfLines={2} selectable>
                s3://{bucketName}/{item.Key}
              </Text>
            </View>
          </View>
        </View>

        <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
          <View style={detailStyles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
            <Text style={[detailStyles.sectionTitle, { color: theme.textLabel }]}>General</Text>
          </View>
          <DetailRow label="Key" value={item.Key} theme={theme} />
          <DetailRow label="Size" value={formatSize(item.Size)} theme={theme} />
          <DetailRow label="Storage Class" value={item.StorageClass || 'STANDARD'} theme={theme} />
          <DetailRow label="ETag" value={item.ETag?.replace(/"/g, '')} theme={theme} />
          <DetailRow label="Last Modified" value={formatDate(item.LastModified)} theme={theme} />
        </View>

        <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
          <View style={detailStyles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
            <Text style={[detailStyles.sectionTitle, { color: theme.textLabel }]}>Ownership & Permissions</Text>
          </View>
          <DetailRow label="Owner" value={item.Owner?.DisplayName || item.Owner?.ID} theme={theme} />
          <DetailRow label="Owner ID" value={item.Owner?.ID} theme={theme} />
        </View>

        {item.ChecksumAlgorithm && item.ChecksumAlgorithm.length > 0 && (
          <View style={[detailStyles.card, { backgroundColor: theme.bgCard }]}>
            <View style={detailStyles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={[detailStyles.sectionTitle, { color: theme.textLabel }]}>Checksums</Text>
            </View>
            {item.ChecksumAlgorithm.map((algo: string, i: number) => (
              <DetailRow key={i} label={algo} value={item[`Checksum${algo.replace('-', '')}`] || ''} theme={theme} />
            ))}
          </View>
        )}

        <View style={{ height: SPACING.huge }} />
      </ScrollView>
    </Animated.View>
  );
}

function DetailRow({ label, value, theme, selectable }: { label: string; value: any; theme: any; selectable?: boolean }) {
  const display = value === null || value === undefined || value === '' ? '\u2014' : String(value);
  return (
    <View style={detailStyles.detailRow}>
      <Text style={[detailStyles.detailLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[detailStyles.detailVal, { color: theme.text }]} selectable={selectable !== false} numberOfLines={5}>{display}</Text>
    </View>
  );
}

export default function S3Screen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: buckets, isLoading, isRefetching, error, refetch } = useBuckets();
  const [selectedBucket, setSelectedBucket] = React.useState<string | null>(null);

  if (selectedBucket) {
    return <ObjectListScreen bucketName={selectedBucket} onBack={() => setSelectedBucket(null)} />;
  }

  const handleTap = (bucketName: string) => {
    Logger.info(TAG, 'Bucket tapped', { bucket: bucketName });
    setSelectedBucket(bucketName);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.danger }]}>
            {(error as any)?.message || t('common.error')}
          </Text>
          <RipplePressable onPress={() => refetch()}>
            <View style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="refresh" size={16} color={theme.accentText} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.retryText, { color: theme.accentText }]}>{t('common.retry')}</Text>
            </View>
          </RipplePressable>
        </View>
      ) : (
        <FlatList
          data={buckets || []}
          keyExtractor={(item: any) => item.Name || ''}
          renderItem={({ item, index }) => (
            <BucketCard item={item} index={index} theme={theme} onPress={() => handleTap(item.Name!)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || false}
              onRefresh={refetch}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="cloud-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('s3.noBuckets')}</Text>
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
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: SPACING.md, marginBottom: 0,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  filterInput: { flex: 1, fontSize: 14 },
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
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  chipText: { ...TYPOGRAPHY.monoSm },
  regionTag: { ...TYPOGRAPHY.caption },
  objRow: {
    flexDirection: 'row', borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.xs, overflow: 'hidden',
  },
  objAccent: { width: 4 },
  objContent: { flex: 1, padding: SPACING.md, paddingLeft: SPACING.sm },
  objHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  objName: { ...TYPOGRAPHY.bodyBold, flex: 1 },
  objPath: { ...TYPOGRAPHY.monoSm, marginTop: 2 },
  objMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  objChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  objChipText: { ...TYPOGRAPHY.monoSm },
  objDate: { ...TYPOGRAPHY.caption, marginLeft: 'auto' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxxl },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  loadingText: { ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  errorText: { ...TYPOGRAPHY.body, textAlign: 'center', marginVertical: SPACING.md },
  retryBtn: {
    marginTop: SPACING.md,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  retryText: { ...TYPOGRAPHY.bodyBold },
  footerText: { textAlign: 'center', fontSize: 11, marginTop: SPACING.md, marginBottom: SPACING.xl },
});

const detailStyles = StyleSheet.create({
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroName: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.xs,
  },
  heroPath: {
    ...TYPOGRAPHY.monoSm,
  },
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,160,0.08)',
  },
  detailLabel: {
    ...TYPOGRAPHY.caption,
    width: 120,
    flexShrink: 0,
    marginRight: SPACING.md,
  },
  detailVal: {
    ...TYPOGRAPHY.body,
    flex: 1,
  },
});
