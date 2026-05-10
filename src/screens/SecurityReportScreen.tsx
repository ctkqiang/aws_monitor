import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '@/theme/ThemeContext';
import { Logger } from '@/utils/logger';
import { Haptic } from '@/utils/haptics';
import RipplePressable from '@/components/RipplePressable';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import {
  generateSecurityReport,
  SecurityReport,
  IAMUserDetail,
  IAMRoleDetail,
  SecretDetail,
} from '@/services/aws/securityReport';
import SecretDetailScreen from './SecretDetailScreen';

const TAG = 'SecurityReport';

interface Props {
  onBack: () => void;
}

export default function SecurityReportScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [expandedSecrets, setExpandedSecrets] = useState<Set<string>>(new Set());
  const [selectedSecret, setSelectedSecret] = useState<{ arn: string; name: string } | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  if (selectedSecret) {
    return (
      <SecretDetailScreen
        secretArn={selectedSecret.arn}
        secretName={selectedSecret.name}
        onBack={() => setSelectedSecret(null)}
      />
    );
  }

  async function loadReport() {
    setLoading(true);
    try {
      const result = await generateSecurityReport();
      setReport(result);
      Logger.info(TAG, '安全报告加载成功');
    } catch (e: any) {
      Logger.error(TAG, '加载安全报告失败', { error: e.message });
      Alert.alert(t('common.error'), e.message || t('securityReport.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  const toggleUser = (userName: string) => {
    Haptic.light();
    const newSet = new Set(expandedUsers);
    if (newSet.has(userName)) {
      newSet.delete(userName);
    } else {
      newSet.add(userName);
    }
    setExpandedUsers(newSet);
  };

  const toggleRole = (roleName: string) => {
    Haptic.light();
    const newSet = new Set(expandedRoles);
    if (newSet.has(roleName)) {
      newSet.delete(roleName);
    } else {
      newSet.add(roleName);
    }
    setExpandedRoles(newSet);
  };

  const toggleSecret = (secretName: string) => {
    Haptic.light();
    const newSet = new Set(expandedSecrets);
    if (newSet.has(secretName)) {
      newSet.delete(secretName);
    } else {
      newSet.add(secretName);
    }
    setExpandedSecrets(newSet);
  };

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

  const renderIAMUser = (user: IAMUserDetail) => {
    const isExpanded = expandedUsers.has(user.UserName);

    return (
      <View key={user.Arn} style={[styles.resourceCard, { backgroundColor: theme.bgCard }]}>
        <RipplePressable onPress={() => toggleUser(user.UserName)} style={styles.resourceHeader}>
          <View style={styles.resourceHeaderLeft}>
            <Ionicons name="person" size={18} color={theme.accent} />
            <View style={{ marginLeft: SPACING.sm }}>
              <Text style={[styles.resourceName, { color: theme.text }]}>{user.UserName}</Text>
              <Text style={[styles.resourceArn, { color: theme.textMuted }]}>
                {user.Arn.split(':').slice(-1)[0]}
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.textMuted}
          />
        </RipplePressable>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>ARN</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{user.Arn}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.created')}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(user.CreateDate)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.lastUsed')}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(user.LastUsedDate)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.passwordLastUsed')}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(user.PasswordLastUsed)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.mfaStatus')}</Text>
              <Text style={user.MFAEnabled ? [styles.detailValue, { color: theme.success }] : [styles.detailValue, { color: theme.danger }]}>
                {user.MFAEnabled ? t('common.enabled') : t('common.disabled')}
              </Text>
            </View>

            {user.PermissionsBoundary && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.permissionsBoundary')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{user.PermissionsBoundary}</Text>
              </View>
            )}

            {user.AccessKeys.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.accessKeys')}</Text>
                <View style={styles.table}>
                  <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.tableHeaderText, { color: theme.textLabel }]}>{t('securityReport.keyId')}</Text>
                    <Text style={[styles.tableHeaderText, { color: theme.textLabel }]}>{t('securityReport.status')}</Text>
                    <Text style={[styles.tableHeaderText, { color: theme.textLabel }]}>{t('securityReport.lastUsed')}</Text>
                  </View>
                  {user.AccessKeys.map((key) => (
                    <View key={key.AccessKeyId} style={[styles.tableRow, { borderBottomColor: theme.borderLight }]}>
                      <Text style={[styles.tableCell, { color: theme.text }]}>{key.AccessKeyId}</Text>
                      <Text style={key.Status === 'Active' ? [styles.tableCell, { color: theme.success }] : [styles.tableCell, { color: theme.danger }]}>
                        {key.Status}
                      </Text>
                      <Text style={[styles.tableCell, { color: theme.textMuted }]}>{formatDate(key.LastUsedDate)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {user.ManagedPolicies.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.managedPolicies')}</Text>
                {user.ManagedPolicies.map((policy) => (
                  <View key={policy.PolicyArn} style={[styles.policyItem, { backgroundColor: theme.bgInput }]}>
                    <Text style={[styles.policyName, { color: theme.text }]}>{policy.PolicyName}</Text>
                    <Text style={[styles.policyArn, { color: theme.textMuted }]}>{policy.PolicyArn}</Text>
                  </View>
                ))}
              </View>
            )}

            {user.InlinePolicies.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.inlinePolicies')}</Text>
                {user.InlinePolicies.map((policy) => (
                  <View key={policy.PolicyName} style={styles.policyContainer}>
                    <Text style={[styles.policyName, { color: theme.text }]}>{policy.PolicyName}</Text>
                    <View style={[styles.codeBlock, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                      <Text style={[styles.codeText, { color: theme.textMuted }]}>
                        {JSON.stringify(JSON.parse(policy.PolicyDocument), null, 2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {Object.keys(user.Tags).length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.tags')}</Text>
                <View style={styles.tagsContainer}>
                  {Object.entries(user.Tags).map(([key, value]) => (
                    <View key={key} style={[styles.tagItem, { backgroundColor: theme.accentLight }]}>
                      <Text style={[styles.tagKey, { color: theme.accent }]}>{key}</Text>
                      <Text style={[styles.tagValue, { color: theme.text }]}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderIAMRole = (role: IAMRoleDetail) => {
    const isExpanded = expandedRoles.has(role.RoleName);

    return (
      <View key={role.Arn} style={[styles.resourceCard, { backgroundColor: theme.bgCard }]}>
        <RipplePressable onPress={() => toggleRole(role.RoleName)} style={styles.resourceHeader}>
          <View style={styles.resourceHeaderLeft}>
            <Ionicons name="shield" size={18} color={theme.accent} />
            <View style={{ marginLeft: SPACING.sm }}>
              <Text style={[styles.resourceName, { color: theme.text }]}>{role.RoleName}</Text>
              <Text style={[styles.resourceArn, { color: theme.textMuted }]}>
                {role.Arn.split(':').slice(-1)[0]}
              </Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.textMuted}
          />
        </RipplePressable>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>ARN</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{role.Arn}</Text>
            </View>

            {role.Description && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('common.description')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{role.Description}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.created')}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(role.CreateDate)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.lastUsed')}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(role.LastUsedDate)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.maxSessionDuration')}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{role.MaxSessionDuration / 3600} {t('securityReport.hours')}</Text>
            </View>

            {role.PermissionsBoundary && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.permissionsBoundary')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{role.PermissionsBoundary}</Text>
              </View>
            )}

            {role.AssumeRolePrincipals.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.assumeRolePrincipals')}</Text>
                {role.AssumeRolePrincipals.map((principal, index) => (
                  <Text key={index} style={[styles.detailValue, { color: theme.text }]}>{principal}</Text>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.trustPolicy')}</Text>
              <View style={[styles.codeBlock, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <Text style={[styles.codeText, { color: theme.textMuted }]}>
                  {JSON.stringify(JSON.parse(role.TrustPolicy), null, 2)}
                </Text>
              </View>
            </View>

            {role.ManagedPolicies.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.managedPolicies')}</Text>
                {role.ManagedPolicies.map((policy) => (
                  <View key={policy.PolicyArn} style={[styles.policyItem, { backgroundColor: theme.bgInput }]}>
                    <Text style={[styles.policyName, { color: theme.text }]}>{policy.PolicyName}</Text>
                    <Text style={[styles.policyArn, { color: theme.textMuted }]}>{policy.PolicyArn}</Text>
                  </View>
                ))}
              </View>
            )}

            {role.InlinePolicies.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.inlinePolicies')}</Text>
                {role.InlinePolicies.map((policy) => (
                  <View key={policy.PolicyName} style={styles.policyContainer}>
                    <Text style={[styles.policyName, { color: theme.text }]}>{policy.PolicyName}</Text>
                    <View style={[styles.codeBlock, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                      <Text style={[styles.codeText, { color: theme.textMuted }]}>
                        {JSON.stringify(JSON.parse(policy.PolicyDocument), null, 2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {Object.keys(role.Tags).length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.tags')}</Text>
                <View style={styles.tagsContainer}>
                  {Object.entries(role.Tags).map(([key, value]) => (
                    <View key={key} style={[styles.tagItem, { backgroundColor: theme.accentLight }]}>
                      <Text style={[styles.tagKey, { color: theme.accent }]}>{key}</Text>
                      <Text style={[styles.tagValue, { color: theme.text }]}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderSecret = (secret: SecretDetail) => {
    const isExpanded = expandedSecrets.has(secret.Name);
    const hasError = !!secret.ErrorInfo;

    return (
      <View key={secret.ARN} style={[styles.resourceCard, { backgroundColor: theme.bgCard }, hasError && { borderWidth: 1, borderColor: theme.danger }]}>
        <RipplePressable
          onPress={() => {
            Haptic.medium();
            setSelectedSecret({ arn: secret.ARN, name: secret.Name });
          }}
          style={styles.resourceHeader}
        >
          <View style={styles.resourceHeaderLeft}>
            <Ionicons name={hasError ? 'warning' : 'lock-closed'} size={18} color={hasError ? theme.danger : theme.accent} />
            <View style={{ marginLeft: SPACING.sm }}>
              <Text style={[styles.resourceName, { color: theme.text }]}>{secret.Name}</Text>
              <Text style={[styles.resourceArn, { color: hasError ? theme.danger : theme.textMuted }]}>
                {hasError ? t('securityReport.errorDetail') : secret.ARN.split(':').slice(-1)[0]}
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.textMuted}
          />
        </RipplePressable>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {hasError ? (
              <View style={[styles.errorBlock, { backgroundColor: theme.bgInput, borderColor: theme.danger }]}>
                <Text style={[styles.errorTitle, { color: theme.danger }]}>{t('securityReport.errorDetail')}</Text>
                <Text style={[styles.errorText, { color: theme.text }]}>{secret.ErrorInfo}</Text>
                <Text style={[styles.errorHint, { color: theme.textMuted }]}>
                  {t('securityReport.errorDetail')}: {t('securityReport.partialFailuresDesc')}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>ARN</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{secret.ARN}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('common.description')}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{secret.Description || t('securityReport.noDescription')}</Text>
            </View>

            {secret.OwningService && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.owningService')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{secret.OwningService}</Text>
              </View>
            )}

            {secret.PrimaryRegion && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.primaryRegion')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{secret.PrimaryRegion}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.created')}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(secret.CreatedDate)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.lastModified')}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(secret.LastModifiedDate)}</Text>
            </View>

            {secret.LastAccessedDate && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.lastAccessed')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(secret.LastAccessedDate)}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.rotationStatus')}</Text>
              <Text style={secret.RotationEnabled ? [styles.detailValue, { color: theme.success }] : [styles.detailValue, { color: theme.danger }]}>
                {secret.RotationEnabled ? t('common.enabled') : t('common.disabled')}
              </Text>
            </View>

            {secret.RotationLambdaARN && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.rotationLambda')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{secret.RotationLambdaARN}</Text>
              </View>
            )}

            {secret.RotationAutomaticallyAfterDays && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.rotationInterval')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{secret.RotationAutomaticallyAfterDays} {t('common.days')}</Text>
              </View>
            )}

            {secret.LastRotatedDate && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.lastRotated')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(secret.LastRotatedDate)}</Text>
              </View>
            )}

            {secret.NextRotationDate && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.nextRotation')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(secret.NextRotationDate)}</Text>
              </View>
            )}

            {secret.VersionId && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.versionId')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{secret.VersionId}</Text>
              </View>
            )}

            {secret.KmsKeyId && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.encryptionKey')}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{secret.KmsKeyId}</Text>
              </View>
            )}

            {secret.DeletedDate && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textLabel }]}>{t('securityReport.scheduledDeletion')}</Text>
                <Text style={[styles.detailValue, { color: theme.danger }]}>{formatDate(secret.DeletedDate)}</Text>
              </View>
            )}

                {secret.ResourcePolicy && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.resourcePolicy')}</Text>
                    <View style={[styles.codeBlock, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                      <Text style={[styles.codeText, { color: theme.textMuted }]}>
                        {JSON.stringify(JSON.parse(secret.ResourcePolicy), null, 2)}
                      </Text>
                    </View>
                  </View>
                )}

                {Object.keys(secret.Tags).length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textLabel }]}>{t('securityReport.tags')}</Text>
                    <View style={styles.tagsContainer}>
                      {Object.entries(secret.Tags).map(([key, value]) => (
                        <View key={key} style={[styles.tagItem, { backgroundColor: theme.accentLight }]}>
                          <Text style={[styles.tagKey, { color: theme.accent }]}>{key}</Text>
                          <Text style={[styles.tagValue, { color: theme.text }]}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('securityReport.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack} accessibilityLabel={t('common.back')}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <Text style={[styles.title, { color: theme.text }]}>{t('securityReport.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.summaryCard, { backgroundColor: theme.bgCard }, SHADOWS.sm]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>{t('securityReport.reportSummary')}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.accent }]}>{report?.IAMUsers.length || 0}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textLabel }]}>{t('securityReport.iamUsers')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.accent }]}>{report?.IAMRoles.length || 0}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textLabel }]}>{t('securityReport.iamRoles')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.accent }]}>{report?.Secrets.length || 0}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textLabel }]}>{t('securityReport.secrets')}</Text>
            </View>
          </View>
          <View style={styles.summaryMeta}>
            <Text style={[styles.summaryMetaText, { color: theme.textMuted }]}>
              {t('securityReport.accountId')}: {report?.AccountId}
            </Text>
            <Text style={[styles.summaryMetaText, { color: theme.textMuted }]}>
              {t('securityReport.generatedAt')}: {formatDate(report?.GeneratedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="person" size={18} color={theme.accent} />
          <Text style={[styles.sectionHeaderText, { color: theme.text }]}>{t('securityReport.iamUsers')}</Text>
          <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
            ({report?.IAMUsers.length || 0})
          </Text>
        </View>

        {report?.IAMUsers.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.bgCard }]}>
            <Ionicons name="person" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('securityReport.noUsers')}</Text>
          </View>
        ) : (
          report?.IAMUsers.map(renderIAMUser)
        )}

        <View style={styles.sectionHeader}>
          <Ionicons name="shield" size={18} color={theme.accent} />
          <Text style={[styles.sectionHeaderText, { color: theme.text }]}>{t('securityReport.iamRoles')}</Text>
          <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
            ({report?.IAMRoles.length || 0})
          </Text>
        </View>

        {report?.IAMRoles.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.bgCard }]}>
            <Ionicons name="shield-checkmark" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('securityReport.noRoles')}</Text>
          </View>
        ) : (
          report?.IAMRoles.map(renderIAMRole)
        )}

        <View style={styles.sectionHeader}>
          <Ionicons name="lock-closed" size={18} color={theme.accent} />
          <Text style={[styles.sectionHeaderText, { color: theme.text }]}>{t('securityReport.secrets')}</Text>
          <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
            ({report?.Secrets.length || 0})
          </Text>
        </View>

        {report?.Secrets.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.bgCard }]}>
            <Ionicons name="lock-open" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('securityReport.noSecrets')}</Text>
          </View>
        ) : (
          report?.Secrets.map(renderSecret)
        )}

        {report?.PartialFailures && report.PartialFailures.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={18} color={theme.danger} />
              <Text style={[styles.sectionHeaderText, { color: theme.danger }]}>{t('securityReport.partialFailures')}</Text>
              <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
                ({report.PartialFailures.length})
              </Text>
            </View>
            <Text style={[styles.summaryMetaText, { color: theme.textMuted, marginBottom: SPACING.md }]}>
              {t('securityReport.partialFailuresDesc')}
            </Text>
            {report.PartialFailures.map((failure, index) => (
              <View key={index} style={[styles.errorBlock, { backgroundColor: theme.bgCard, borderColor: theme.danger }]}>
                <Text style={[styles.errorText, { color: theme.text }]}>{failure}</Text>
              </View>
            ))}
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
  title: { ...TYPOGRAPHY.title, fontSize: 15 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  scroll: { padding: SPACING.lg },
  summaryCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  summaryTitle: { ...TYPOGRAPHY.title, marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { ...TYPOGRAPHY.title, fontSize: 24 },
  summaryLabel: { ...TYPOGRAPHY.label, marginTop: SPACING.xs },
  summaryMeta: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  summaryMetaText: { ...TYPOGRAPHY.caption },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionHeaderText: { ...TYPOGRAPHY.title, marginLeft: SPACING.sm },
  sectionCount: { ...TYPOGRAPHY.caption, marginLeft: SPACING.xs },
  resourceCard: {
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  resourceHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  resourceName: { ...TYPOGRAPHY.bodyBold },
  resourceArn: { ...TYPOGRAPHY.caption },
  expandedContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: { ...TYPOGRAPHY.label, flex: 1 },
  detailValue: { ...TYPOGRAPHY.body, flex: 2, textAlign: 'right' },
  section: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  table: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeaderText: { ...TYPOGRAPHY.caption, flex: 1, textAlign: 'center' },
  tableRow: {
    flexDirection: 'row',
    padding: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: { ...TYPOGRAPHY.caption, flex: 1, textAlign: 'center' },
  policyItem: {
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  policyName: { ...TYPOGRAPHY.bodyBold },
  policyArn: { ...TYPOGRAPHY.caption },
  policyContainer: { marginBottom: SPACING.md },
  codeBlock: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  codeText: { ...TYPOGRAPHY.monoSm },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  tagKey: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  tagValue: { ...TYPOGRAPHY.caption, marginLeft: SPACING.xs },
  emptyState: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md },
  errorBlock: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  errorTitle: { ...TYPOGRAPHY.bodyBold, marginBottom: SPACING.sm },
  errorText: { ...TYPOGRAPHY.body },
  errorHint: { ...TYPOGRAPHY.caption, marginTop: SPACING.sm },
});
