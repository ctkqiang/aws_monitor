import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SecretsManagerClient, DescribeSecretCommand, GetResourcePolicyCommand, Tag } from '@aws-sdk/client-secrets-manager';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '@/theme/ThemeContext';
import { createAwsConfigForService } from '@/services/aws/client';
import { Logger } from '@/utils/logger';
import { Haptic } from '@/utils/haptics';
import RipplePressable from '@/components/RipplePressable';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { SecretDetail } from '@/services/aws/securityReport';
import { getSecretValue, SecretValueResult, SecretValueError } from '@/services/aws/getSecretValue';

const TAG = 'SecretDetail';

interface Props {
  secretArn: string;
  secretName: string;
  onBack: () => void;
}

function convertTags(tagsList: Tag[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!tagsList) return result;
  for (const tag of tagsList) {
    if (tag.Key && tag.Value) {
      result[tag.Key] = tag.Value;
    }
  }
  return result;
}

async function fetchOneSecret(arn: string, name: string): Promise<SecretDetail> {
  const config = createAwsConfigForService();
  const client = new SecretsManagerClient(config);
  const describeRes = await client.send(new DescribeSecretCommand({ SecretId: arn }));

  let resourcePolicy: string | undefined;
  try {
    const policyRes = await client.send(new GetResourcePolicyCommand({ SecretId: arn }));
    resourcePolicy = policyRes.ResourcePolicy;
  } catch {
    resourcePolicy = undefined;
  }

  const versionId = describeRes.VersionIdsToStages
    ? Object.entries(describeRes.VersionIdsToStages).find(
        ([, stages]) => stages.includes('AWSCURRENT'),
      )?.[0]
    : undefined;

  return {
    ARN: describeRes.ARN || arn,
    Name: describeRes.Name || name,
    Description: describeRes.Description,
    OwningService: describeRes.OwningService,
    PrimaryRegion: (describeRes as any).PrimaryRegion,
    CreatedDate: describeRes.CreatedDate,
    LastModifiedDate: describeRes.LastChangedDate,
    LastAccessedDate: describeRes.LastAccessedDate,
    LastRotatedDate: describeRes.LastRotatedDate,
    NextRotationDate: describeRes.NextRotationDate,
    DeletedDate: describeRes.DeletedDate,
    RotationEnabled: describeRes.RotationEnabled || false,
    RotationLambdaARN: describeRes.RotationLambdaARN,
    RotationAutomaticallyAfterDays: describeRes.RotationRules?.AutomaticallyAfterDays,
    VersionId: versionId,
    KmsKeyId: describeRes.KmsKeyId,
    ResourcePolicy: resourcePolicy,
    Tags: convertTags(describeRes.Tags),
  };
}

function DetailRow({
  label, value, theme, mono, color,
}: { label: string; value: string; theme: any; mono?: boolean; color?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{label}</Text>
      <Text
        style={[mono ? styles.detailValueMono : styles.detailValue, { color: color || theme.text }]}
        selectable
        numberOfLines={3}
      >
        {value || '\u2014'}
      </Text>
    </View>
  );
}

function SectionHeading({ title, icon, theme }: { title: string; icon: keyof typeof Ionicons.glyphMap; theme: any }) {
  return (
    <View style={[styles.sectionHeading, { borderBottomColor: theme.border }]}>
      <Ionicons name={icon} size={16} color={theme.accent} style={{ marginRight: SPACING.sm }} />
      <Text style={[styles.sectionHeadingText, { color: theme.textLabel }]}>{title}</Text>
    </View>
  );
}

function StatusBadge({ label, isGood, theme }: { label: string; isGood: boolean; theme: any }) {
  return (
    <View style={[styles.badge, { backgroundColor: isGood ? theme.success + '18' : theme.danger + '18' }]}>
      <View style={[styles.badgeDot, { backgroundColor: isGood ? theme.success : theme.danger }]} />
      <Text style={[styles.badgeText, { color: isGood ? theme.success : theme.danger }]}>{label}</Text>
    </View>
  );
}

export default function SecretDetailScreen({ secretArn, secretName, onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState<SecretDetail | null>(null);

  const [showSecretValue, setShowSecretValue] = useState(false);
  const [loadingSecretValue, setLoadingSecretValue] = useState(false);
  const [secretValueResult, setSecretValueResult] = useState<SecretValueResult | null>(null);
  const [secretValueError, setSecretValueError] = useState<string | null>(null);

  useEffect(() => {
    loadSecret();
  }, []);

  async function loadSecret() {
    setLoading(true);
    try {
      const result = await fetchOneSecret(secretArn, secretName);
      setSecret(result);
      Logger.info(TAG, 'Secret 详情加载成功', { name: result.Name });
    } catch (e: any) {
      Logger.error(TAG, '加载 Secret 详情失败', { error: e.message });
      Alert.alert(t('common.error'), e.message || 'Failed to load secret details');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSecretValue() {
    if (showSecretValue) {
      setShowSecretValue(false);
      setSecretValueResult(null);
      setSecretValueError(null);
      return;
    }

    Haptic.medium();
    setShowSecretValue(true);
    setLoadingSecretValue(true);
    setSecretValueError(null);

    try {
      const result = await getSecretValue(secretArn);
      setSecretValueResult(result);
    } catch (e: any) {
      if (e instanceof SecretValueError) {
        setSecretValueError(e.message);
      } else {
        setSecretValueError(e.message || '未知错误');
      }
    } finally {
      setLoadingSecretValue(false);
    }
  }

  const handleCopyValue = (value: string) => {
    Haptic.light();
    try {
      Clipboard.setString(value);
      Alert.alert(t('common.copied') || 'Copied', undefined, [{ text: t('common.ok') || 'OK' }]);
    } catch {
      // Clipboard unavailable on this platform
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!secret) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <RipplePressable onPress={onBack} accessibilityLabel={t('common.back')}>
            <View style={styles.backRow}>
              <Ionicons name="chevron-back" size={20} color={theme.accent} />
              <Text style={[styles.backText, { color: theme.accent }]}>{t('common.back')}</Text>
            </View>
          </RipplePressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{secretName}</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.danger} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('common.noData')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (date?: Date): string => {
    if (!date) return t('common.never');
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const shortArn = secret.ARN.split(':').slice(-1)[0] || secret.ARN;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack} accessibilityLabel={t('common.back')}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{secret.Name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.heroCard, { backgroundColor: theme.bgCard }, SHADOWS.md]}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroName, { color: theme.text }]}>{secret.Name}</Text>
              <Text style={[styles.heroSub, { color: theme.textMuted }]} numberOfLines={1} selectable>{secret.ARN}</Text>
            </View>
            <StatusBadge
              label={secret.RotationEnabled ? t('securityReport.rotationStatus') + ': ' + t('common.enabled') : t('securityReport.rotationStatus') + ': ' + t('common.disabled')}
              isGood={secret.RotationEnabled}
              theme={theme}
            />
          </View>
          <View style={styles.heroGrid}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: theme.textMuted }]}>{t('securityReport.versionId')}</Text>
              <Text style={[styles.heroStatValue, { color: theme.text }]} numberOfLines={1}>{secret.VersionId || '\u2014'}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: theme.textMuted }]}>{t('securityReport.encryptionKey')}</Text>
              <Text style={[styles.heroStatValue, { color: theme.text }]} numberOfLines={1}>{secret.KmsKeyId ? shortArn : '\u2014'}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: theme.textMuted }]}>{t('securityReport.lastModified')}</Text>
              <Text style={[styles.heroStatValue, { color: theme.text }]} numberOfLines={1}>{formatDate(secret.LastModifiedDate)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionHeading title={t('securityReport.reportSummary')} icon="information-circle-outline" theme={theme} />
          <DetailRow label={t('common.description')} value={secret.Description || t('securityReport.noDescription')} theme={theme} />
          {secret.OwningService && (
            <DetailRow label={t('securityReport.owningService')} value={secret.OwningService} theme={theme} />
          )}
          {secret.PrimaryRegion && (
            <DetailRow label={t('securityReport.primaryRegion')} value={secret.PrimaryRegion} theme={theme} />
          )}
          <DetailRow label={t('securityReport.created')} value={formatDate(secret.CreatedDate)} theme={theme} />
          <DetailRow label={t('securityReport.lastModified')} value={formatDate(secret.LastModifiedDate)} theme={theme} />
          {secret.LastAccessedDate && (
            <DetailRow label={t('securityReport.lastAccessed')} value={formatDate(secret.LastAccessedDate)} theme={theme} />
          )}
          {secret.DeletedDate && (
            <DetailRow label={t('securityReport.scheduledDeletion')} value={formatDate(secret.DeletedDate)} theme={theme} color={theme.danger} />
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionHeading title={t('securityReport.rotationStatus')} icon="refresh-outline" theme={theme} />
          <DetailRow
            label={t('securityReport.rotationStatus')}
            value={secret.RotationEnabled ? t('common.enabled') : t('common.disabled')}
            theme={theme}
            color={secret.RotationEnabled ? theme.success : theme.danger}
          />
          {secret.RotationLambdaARN && (
            <DetailRow label={t('securityReport.rotationLambda')} value={secret.RotationLambdaARN} theme={theme} mono />
          )}
          {secret.RotationAutomaticallyAfterDays && (
            <DetailRow
              label={t('securityReport.rotationInterval')}
              value={`${secret.RotationAutomaticallyAfterDays} ${t('common.days')}`}
              theme={theme}
            />
          )}
          {secret.LastRotatedDate && (
            <DetailRow label={t('securityReport.lastRotated')} value={formatDate(secret.LastRotatedDate)} theme={theme} />
          )}
          {secret.NextRotationDate && (
            <DetailRow label={t('securityReport.nextRotation')} value={formatDate(secret.NextRotationDate)} theme={theme} />
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionHeading title={t('securityReport.encryptionKey')} icon="key-outline" theme={theme} />
          {secret.KmsKeyId && (
            <DetailRow label="KMS Key ARN" value={secret.KmsKeyId} theme={theme} mono />
          )}
          {secret.VersionId && (
            <DetailRow label={t('securityReport.versionId')} value={secret.VersionId} theme={theme} mono />
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionHeading title={t('securityReport.secretValue')} icon="lock-open-outline" theme={theme} />

          {!showSecretValue ? (
            <Text style={[styles.valueHint, { color: theme.textMuted }]}>
              {t('securityReport.secretValueHint')}
            </Text>
          ) : null}

          {showSecretValue && loadingSecretValue && (
            <View style={styles.valueLoadingRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.valueLoadingText, { color: theme.textMuted }]}>
                {t('securityReport.fetchingSecretValue')}
              </Text>
            </View>
          )}

          {showSecretValue && secretValueError && !loadingSecretValue && (
            <View style={[styles.valueErrorBlock, { backgroundColor: theme.danger + '10', borderColor: theme.danger }]}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.valueErrorText, { color: theme.danger }]}>{secretValueError}</Text>
            </View>
          )}

          {showSecretValue && secretValueResult && !loadingSecretValue && (
            <View>
              <View style={[styles.valueMeta, { borderBottomColor: theme.border }]}>
                {secretValueResult.versionId && (
                  <Text style={[styles.valueMetaText, { color: theme.textMuted }]}>
                    {t('securityReport.versionId')}: {secretValueResult.versionId}
                  </Text>
                )}
                <Text style={[styles.valueMetaText, { color: theme.textMuted }]}>
                  {secretValueResult.keyValuePairs.length} {t('securityReport.keyValueCount')}
                </Text>
              </View>

              <View style={[styles.sensitiveBanner, { backgroundColor: theme.warning + '15', borderColor: theme.warning }]}>
                <Ionicons name="eye-off-outline" size={14} color={theme.warning} style={{ marginRight: SPACING.xs }} />
                <Text style={[styles.sensitiveBannerText, { color: theme.warning }]}>
                  {t('securityReport.sensitiveDataWarning')}
                </Text>
              </View>

              {secretValueResult.keyValuePairs.map((kv, index) => (
                <View key={index} style={[styles.kvRow, { borderBottomColor: theme.borderLight }]}>
                  <View style={styles.kvKeyRow}>
                    <Text style={[styles.kvKey, { color: theme.accent }]}>{kv.key}</Text>
                    <RipplePressable
                      onPress={() => handleCopyValue(kv.value)}
                      haptic="light"
                      accessibilityLabel={t('common.copy') + ' ' + kv.key}
                    >
                      <Ionicons name="copy-outline" size={14} color={theme.textMuted} />
                    </RipplePressable>
                  </View>
                  <Text style={[styles.kvValue, { color: theme.text }]} selectable numberOfLines={8}>
                    {kv.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <RipplePressable
            onPress={handleToggleSecretValue}
            disabled={loadingSecretValue}
            style={[
              styles.valueToggle,
              {
                backgroundColor: showSecretValue ? theme.danger + '15' : theme.accentLight,
                borderColor: showSecretValue ? theme.danger : theme.accent + '40',
              },
            ]}
          >
            <Ionicons
              name={showSecretValue ? 'eye-off' : 'eye'}
              size={16}
              color={showSecretValue ? theme.danger : theme.accent}
              style={{ marginRight: SPACING.xs }}
            />
            <Text style={[styles.valueToggleText, { color: showSecretValue ? theme.danger : theme.accent }]}>
              {showSecretValue ? t('securityReport.hideSecretValue') : t('securityReport.revealSecretValue')}
            </Text>
          </RipplePressable>
        </View>

        {secret.ResourcePolicy && (
          <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
            <SectionHeading title={t('securityReport.resourcePolicy')} icon="document-text-outline" theme={theme} />
            <View style={[styles.codeBlock, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
              <Text style={[styles.codeText, { color: theme.text }]} selectable>
                {JSON.stringify(JSON.parse(secret.ResourcePolicy), null, 2)}
              </Text>
            </View>
          </View>
        )}

        {Object.keys(secret.Tags).length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
            <SectionHeading title={t('securityReport.tags')} icon="pricetags-outline" theme={theme} />
            <View style={styles.tagsContainer}>
              {Object.entries(secret.Tags).map(([key, value]) => (
                <View key={key} style={[styles.tagChip, { backgroundColor: theme.accentLight }]}>
                  <Text style={[styles.tagChipKey, { color: theme.accent }]}>{key}</Text>
                  <Text style={[styles.tagChipValue, { color: theme.text }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { ...TYPOGRAPHY.bodyBold, marginLeft: SPACING.xs },
  headerTitle: { ...TYPOGRAPHY.title, fontSize: 15, flex: 1, textAlign: 'center' },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  scroll: { padding: SPACING.lg },
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  heroName: { ...TYPOGRAPHY.h2, marginBottom: SPACING.xs },
  heroSub: { ...TYPOGRAPHY.caption },
  heroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.md,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: { ...TYPOGRAPHY.caption, marginBottom: SPACING.xs },
  heroStatValue: { ...TYPOGRAPHY.bodyBold, textAlign: 'center' },
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeadingText: { ...TYPOGRAPHY.label, textTransform: 'uppercase' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.xs,
  },
  detailLabel: { ...TYPOGRAPHY.label, flex: 1, marginRight: SPACING.md },
  detailValue: { ...TYPOGRAPHY.body, flex: 2, textAlign: 'right' },
  detailValueMono: { ...TYPOGRAPHY.monoSm, flex: 2, textAlign: 'right' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: SPACING.xs,
  },
  badgeText: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  codeBlock: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  codeText: { ...TYPOGRAPHY.monoSm },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  tagChipKey: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  tagChipValue: { ...TYPOGRAPHY.caption, marginLeft: SPACING.xs },
  valueHint: { ...TYPOGRAPHY.body, marginBottom: SPACING.md },
  valueToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  valueToggleText: { ...TYPOGRAPHY.bodyBold, fontSize: 13 },
  valueLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  valueLoadingText: { ...TYPOGRAPHY.body, marginLeft: SPACING.sm },
  valueErrorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  valueErrorText: { ...TYPOGRAPHY.body, flex: 1 },
  valueMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  valueMetaText: { ...TYPOGRAPHY.caption },
  sensitiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  sensitiveBannerText: { ...TYPOGRAPHY.caption, fontSize: 11, flex: 1 },
  kvRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kvKeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  kvKey: { ...TYPOGRAPHY.bodyBold },
  kvValue: { ...TYPOGRAPHY.monoSm },
});
