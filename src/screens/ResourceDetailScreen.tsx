import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, ScrollView, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';

const TAG = 'ResourceDetail';

export type ResourceType = 'rds' | 'elasticache' | 'lb' | 'sg' | 'ontap' | 's3';

interface Props {
  resourceType: ResourceType;
  item: any;
  onBack: () => void;
}

function DetailRow({ label, value, theme, selectable }: { label: string; value: any; theme: any; selectable?: boolean }) {
  const display = value === null || value === undefined || value === '' ? '\u2014' : String(value);
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.detailVal, { color: theme.text }]} selectable={selectable !== false} numberOfLines={5}>{display}</Text>
    </View>
  );
}

function StatusBadge({ status, isGood, theme }: { status: string; isGood: boolean; theme: any }) {
  return (
    <View style={[styles.heroBadge, { backgroundColor: isGood ? theme.success + '18' : theme.danger + '18' }]}>
      <View style={[styles.heroBadgeDot, { backgroundColor: isGood ? theme.success : theme.danger }]} />
      <Text style={[styles.heroBadgeText, { color: isGood ? theme.success : theme.danger }]}>{status}</Text>
    </View>
  );
}

function SectionTitle({ title, icon, theme }: { title: string; icon: keyof typeof Ionicons.glyphMap; theme: any }) {
  return (
    <View style={[styles.section, { borderBottomColor: theme.border }]}>
      <Ionicons name={icon} size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
      <Text style={[styles.sectionText, { color: theme.textLabel }]}>{title}</Text>
    </View>
  );
}

function renderRDSDetail(item: any, theme: any, t: any, rd: any) {
  const isAvailable = item.DBInstanceStatus === 'available';
  const secGroups = item.VpcSecurityGroups?.map((sg: any) => sg.VpcSecurityGroupId || sg).join(', ') || '';
  const parameterGroups = item.DBParameterGroups?.map((pg: any) => pg.DBParameterGroupName).join(', ') || '';
  const optionGroups = item.OptionGroupMemberships?.map((og: any) => og.OptionGroupName).join(', ') || '';
  const subnet = item.DBSubnetGroup;
  const endpoint = item.Endpoint;

  return (
    <>
      <View style={[styles.heroCard, { backgroundColor: theme.bgCard }, SHADOWS.md]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroName, { color: theme.text }]}>{item.DBInstanceIdentifier}</Text>
            <Text style={[styles.heroArn, { color: theme.textMuted }]} numberOfLines={1}>{item.DBInstanceArn}</Text>
          </View>
          <StatusBadge status={item.DBInstanceStatus || ''} isGood={isAvailable} theme={theme} />
        </View>
        <View style={styles.heroGrid}>
          <HeroStat label={rd.engine} value={`${item.Engine} ${item.EngineVersion}`} theme={theme} />
          <HeroStat label={rd.class} value={item.DBInstanceClass} theme={theme} />
          <HeroStat label={rd.storage} value={`${item.AllocatedStorage || 0} ${rd.gib} (${item.StorageType || ''})`} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.connectivity} icon="globe-outline" theme={theme} />
        <DetailRow label={rd.endpoint} value={endpoint ? `${endpoint.Address}:${endpoint.Port}` : ''} theme={theme} />
        <DetailRow label={rd.port} value={endpoint?.Port} theme={theme} />
        <DetailRow label={rd.multiAz} value={item.MultiAZ ? rd.yes : rd.no} theme={theme} />
        <DetailRow label={rd.publiclyAccessible} value={item.PubliclyAccessible ? rd.yes : rd.no} theme={theme} />
        <DetailRow label={rd.vpcId} value={item.DBSubnetGroup?.VpcId} theme={theme} />
        <DetailRow label={rd.subnetGroup} value={subnet?.DBSubnetGroupName} theme={theme} />
        <DetailRow label={rd.subnets} value={subnet?.Subnets?.map((s: any) => s.SubnetIdentifier).join(', ')} theme={theme} />
        <DetailRow label={rd.securityGroups} value={secGroups} theme={theme} />
        <DetailRow label={rd.availabilityZone} value={item.AvailabilityZone} theme={theme} />
        {item.SecondaryAvailabilityZone ? (
          <DetailRow label={rd.secondaryAz} value={item.SecondaryAvailabilityZone} theme={theme} />
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.configuration} icon="settings-outline" theme={theme} />
        <DetailRow label={rd.engine} value={item.Engine} theme={theme} />
        <DetailRow label={rd.engineVersion} value={item.EngineVersion} theme={theme} />
        <DetailRow label={rd.dbInstanceClass} value={item.DBInstanceClass} theme={theme} />
        <DetailRow label={rd.allocatedStorage} value={`${item.AllocatedStorage || 0} ${rd.gib}`} theme={theme} />
        <DetailRow label={rd.storageType} value={item.StorageType} theme={theme} />
        <DetailRow label={rd.iops} value={item.Iops} theme={theme} />
        <DetailRow label={rd.maxAllocatedStorage} value={item.MaxAllocatedStorage ? `${item.MaxAllocatedStorage} ${rd.gib}` : ''} theme={theme} />
        <DetailRow label={rd.storageEncrypted} value={item.StorageEncrypted ? rd.yes : rd.no} theme={theme} />
        <DetailRow label={rd.kmsKeyId} value={item.KmsKeyId} theme={theme} />
        <DetailRow label={rd.licenseModel} value={item.LicenseModel} theme={theme} />
        <DetailRow label={rd.backupRetention} value={item.BackupRetentionPeriod ? `${item.BackupRetentionPeriod} ${rd.days}` : ''} theme={theme} />
        <DetailRow label={rd.backupWindow} value={item.PreferredBackupWindow} theme={theme} />
        <DetailRow label={rd.maintenanceWindow} value={item.PreferredMaintenanceWindow} theme={theme} />
        <DetailRow label={rd.autoMinorUpgrade} value={item.AutoMinorVersionUpgrade ? rd.yes : rd.no} theme={theme} />
        <DetailRow label={rd.deletionProtection} value={item.DeletionProtection ? rd.enabled : rd.disabled} theme={theme} />
        <DetailRow label={rd.copyTagsToSnapshots} value={item.CopyTagsToSnapshot ? rd.yes : rd.no} theme={theme} />
        <DetailRow label={rd.parameterGroups} value={parameterGroups} theme={theme} />
        <DetailRow label={rd.optionGroups} value={optionGroups} theme={theme} />
        <DetailRow label={rd.iamDbAuth} value={item.IAMDatabaseAuthenticationEnabled ? rd.enabled : rd.disabled} theme={theme} />
        <DetailRow label={rd.performanceInsights} value={item.PerformanceInsightsEnabled ? rd.enabled : rd.disabled} theme={theme} />
        <DetailRow label={rd.caCertificate} value={item.CACertificateIdentifier} theme={theme} />
        <DetailRow label={rd.createdAt} value={item.InstanceCreateTime ? new Date(item.InstanceCreateTime).toLocaleString() : ''} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.statusMonitoring} icon="pulse-outline" theme={theme} />
        <DetailRow label={rd.status} value={item.DBInstanceStatus} theme={theme} />
        <DetailRow label={rd.enhancedMonitoring} value={item.MonitoringInterval && item.MonitoringInterval > 0 ? `Every ${item.MonitoringInterval}${rd.seconds}` : rd.disabled} theme={theme} />
        <DetailRow label={rd.monitoringRole} value={item.MonitoringRoleArn} theme={theme} />
        <DetailRow label={rd.latestRestorableTime} value={item.LatestRestorableTime ? new Date(item.LatestRestorableTime).toLocaleString() : ''} theme={theme} />
      </View>

      {item.ReadReplicaDBInstanceIdentifiers?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={rd.readReplicas} icon="copy-outline" theme={theme} />
          {item.ReadReplicaDBInstanceIdentifiers.map((r: string, i: number) => (
            <DetailRow key={i} label={`${rd.replica} ${i + 1}`} value={r} theme={theme} />
          ))}
        </View>
      )}
    </>
  );
}

function renderElastiCacheDetail(item: any, theme: any, t: any, rd: any) {
  const isAvailable = item.CacheClusterStatus === 'available';
  const endpoint = item.ConfigurationEndpoint || item.CacheNodes?.[0]?.Endpoint;

  return (
    <>
      <View style={[styles.heroCard, { backgroundColor: theme.bgCard }, SHADOWS.md]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroName, { color: theme.text }]}>{item.CacheClusterId}</Text>
            <Text style={[styles.heroArn, { color: theme.textMuted }]} numberOfLines={1}>{item.ARN}</Text>
          </View>
          <StatusBadge status={item.CacheClusterStatus || ''} isGood={isAvailable} theme={theme} />
        </View>
        <View style={styles.heroGrid}>
          <HeroStat label={rd.engine} value={`${item.Engine} ${item.EngineVersion}`} theme={theme} />
          <HeroStat label={rd.nodeType} value={item.CacheNodeType} theme={theme} />
          <HeroStat label={rd.nodes} value={String(item.NumCacheNodes || 1)} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.connectivity} icon="globe-outline" theme={theme} />
        <DetailRow label={rd.endpoint} value={endpoint ? `${endpoint.Address}:${endpoint.Port}` : ''} theme={theme} />
        <DetailRow label={rd.port} value={endpoint?.Port || item.Port} theme={theme} />
        {endpoint?.Address ? null : <DetailRow label={rd.endpoint} value={item.ConfigurationEndpoint ? `${item.ConfigurationEndpoint.Address}:${item.ConfigurationEndpoint.Port}` : ''} theme={theme} />}
        <DetailRow label={rd.cacheSubnetGroup} value={item.CacheSubnetGroupName} theme={theme} />
        <DetailRow label={rd.securityGroups} value={item.SecurityGroups?.map((sg: any) => sg.SecurityGroupId).join(', ')} theme={theme} />
        <DetailRow label={rd.availabilityZone} value={item.PreferredAvailabilityZone} theme={theme} />
        <DetailRow label={rd.multiAz} value={item.MultiAZ} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.configuration} icon="settings-outline" theme={theme} />
        <DetailRow label={rd.engine} value={item.Engine} theme={theme} />
        <DetailRow label={rd.engineVersion} value={item.EngineVersion} theme={theme} />
        <DetailRow label={rd.nodeType} value={item.CacheNodeType} theme={theme} />
        <DetailRow label={rd.numNodes} value={item.NumCacheNodes} theme={theme} />
        <DetailRow label={rd.cacheParameterGroup} value={item.CacheParameterGroup?.CacheParameterGroupName} theme={theme} />
        <DetailRow label={rd.parameterApplyStatus} value={item.CacheParameterGroup?.ParameterApplyStatus} theme={theme} />
        <DetailRow label={rd.snapshotRetention} value={item.SnapshotRetentionLimit ? `${item.SnapshotRetentionLimit} ${rd.days}` : ''} theme={theme} />
        <DetailRow label={rd.snapshotWindow} value={item.SnapshotWindow} theme={theme} />
        <DetailRow label={rd.maintenanceWindow} value={item.PreferredMaintenanceWindow} theme={theme} />
        <DetailRow label={rd.autoMinorUpgrade} value={item.AutoMinorVersionUpgrade ? rd.yes : rd.no} theme={theme} />
        <DetailRow label={rd.atRestEncryption} value={item.AtRestEncryptionEnabled ? rd.enabled : rd.disabled} theme={theme} />
        <DetailRow label={rd.transitEncryption} value={item.TransitEncryptionEnabled ? rd.enabled : rd.disabled} theme={theme} />
        <DetailRow label={rd.authToken} value={item.AuthTokenEnabled ? rd.enabled : rd.disabled} theme={theme} />
        <DetailRow label={rd.notificationConfig} value={item.NotificationConfiguration?.TopicArn} theme={theme} />
        <DetailRow label={rd.createdAt} value={item.CacheClusterCreateTime ? new Date(item.CacheClusterCreateTime).toLocaleString() : ''} theme={theme} />
      </View>
    </>
  );
}

function renderLBDetail(item: any, theme: any, t: any, rd: any) {
  const isActive = item.State?.Code === 'active';
  const azs = item.AvailabilityZones?.map((az: any) => `${az.ZoneName} (${az.SubnetId})`).join(', ') || '';

  return (
    <>
      <View style={[styles.heroCard, { backgroundColor: theme.bgCard }, SHADOWS.md]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroName, { color: theme.text }]}>{item.LoadBalancerName}</Text>
            <Text style={[styles.heroArn, { color: theme.textMuted }]} numberOfLines={1}>{item.LoadBalancerArn}</Text>
          </View>
          <StatusBadge status={item.State?.Code || ''} isGood={isActive} theme={theme} />
        </View>
        <View style={styles.heroGrid}>
          <HeroStat label={rd.type} value={item.Type} theme={theme} />
          <HeroStat label={rd.scheme} value={item.Scheme || ''} theme={theme} />
          <HeroStat label="DNS" value={item.DNSName || ''} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.network} icon="globe-outline" theme={theme} />
        <DetailRow label={rd.dnsName} value={item.DNSName} theme={theme} />
        <DetailRow label={rd.canonicalHostedZone} value={item.CanonicalHostedZoneId} theme={theme} />
        <DetailRow label={rd.vpcId} value={item.VpcId} theme={theme} />
        <DetailRow label={rd.availabilityZone} value={azs} theme={theme} />
        {item.SubnetIds?.map((s: string, i: number) => (
          <DetailRow key={i} label={`${rd.subnets} ${i + 1}`} value={s} theme={theme} />
        ))}
        <DetailRow label={rd.securityGroups} value={item.SecurityGroups?.join(', ')} theme={theme} />
        <DetailRow label={rd.ipAddressType} value={item.IpAddressType} theme={theme} />
        <DetailRow label={rd.customerOwnedPool} value={item.CustomerOwnedIpv4Pool} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.configuration} icon="settings-outline" theme={theme} />
        <DetailRow label={rd.type} value={item.Type} theme={theme} />
        <DetailRow label={rd.scheme} value={item.Scheme} theme={theme} />
        <DetailRow label={rd.state} value={item.State?.Code} theme={theme} />
        <DetailRow label={rd.stateReason} value={item.State?.Reason} theme={theme} />
        <DetailRow label={rd.deletionProtection} value={item.Attributes?.find((a: any) => a.Key === 'deletion_protection.enabled')?.Value === 'true' ? rd.enabled : rd.disabled} theme={theme} />
        <DetailRow label={rd.idleTimeout} value={item.Attributes?.find((a: any) => a.Key === 'idle_timeout.timeout_seconds')?.Value ? `${item.Attributes.find((a: any) => a.Key === 'idle_timeout.timeout_seconds').Value}${rd.seconds}` : ''} theme={theme} />
        <DetailRow label={rd.http2} value={item.Attributes?.find((a: any) => a.Key === 'routing.http2.enabled')?.Value === 'true' ? rd.enabled : rd.disabled} theme={theme} />
        <DetailRow label={rd.dropHeaders} value={item.Attributes?.find((a: any) => a.Key === 'routing.http.drop_invalid_header_fields.enabled')?.Value === 'true' ? rd.yes : rd.no} theme={theme} />
        <DetailRow label={rd.createdAt} value={item.CreatedTime ? new Date(item.CreatedTime).toLocaleString() : ''} theme={theme} />
      </View>

      {item.Listeners?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={`${rd.listeners} (${item.Listeners.length})`} icon="headset-outline" theme={theme} />
          {item.Listeners.map((l: any, i: number) => (
            <DetailRow key={i} label={`${t('auth.port') || 'Port'} ${l.Port} (${l.Protocol})`} value={`→ ${l.DefaultActions?.[0]?.TargetGroupArn?.split('/').pop() || l.DefaultActions?.[0]?.Type}`} theme={theme} />
          ))}
        </View>
      )}
    </>
  );
}

function renderSGDetail(item: any, theme: any, t: any, rd: any) {
  const inboundRules = item.IpPermissions || [];
  const outboundRules = item.IpPermissionsEgress || [];

  const formatIpRanges = (ranges: any[]) =>
    ranges?.map((r: any) => r.CidrIp || r.CidrIpv6 || r.Description || r.GroupId || r.ReferencedGroupId?.GroupId).filter(Boolean).join(', ') || '';

  return (
    <>
      <View style={[styles.heroCard, { backgroundColor: theme.bgCard }, SHADOWS.md]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroName, { color: theme.text }]}>{item.GroupName}</Text>
            <Text style={[styles.heroArn, { color: theme.textMuted }]} numberOfLines={1}>{item.GroupId}</Text>
          </View>
        </View>
        <View style={styles.heroGrid}>
          <HeroStat label={rd.inboundRules} value={String(inboundRules.length)} theme={theme} />
          <HeroStat label={rd.outboundRules} value={String(outboundRules.length)} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.general} icon="information-circle-outline" theme={theme} />
        <DetailRow label={rd.groupName} value={item.GroupId} theme={theme} />
        <DetailRow label={rd.groupName} value={item.GroupName} theme={theme} />
        <DetailRow label={rd.groupDescription} value={item.Description} theme={theme} />
        <DetailRow label={rd.vpcId} value={item.VpcId} theme={theme} />
        <DetailRow label={rd.ownerId} value={item.OwnerId} theme={theme} />
      </View>

      {item.Tags?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={`${rd.tags} (${item.Tags.length})`} icon="pricetags-outline" theme={theme} />
          {item.Tags.map((t: any, i: number) => (
            <DetailRow key={i} label={t.Key} value={t.Value} theme={theme} />
          ))}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={`${rd.inboundRules} (${inboundRules.length})`} icon="arrow-down-outline" theme={theme} />
        {inboundRules.length === 0 ? (
          <Text style={[styles.emptySection, { color: theme.textMuted }]}>{rd.noInboundRules}</Text>
        ) : (
          inboundRules.map((rule: any, i: number) => (
            <View key={i} style={[styles.ruleBlock, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
              <Text style={[styles.ruleTitle, { color: theme.text }]}>
                {rule.IpProtocol === '-1' ? rd.allTraffic : rule.IpProtocol.toUpperCase()} {rule.FromPort === rule.ToPort ? `(${rule.FromPort})` : `(${rule.FromPort}-${rule.ToPort})`}
              </Text>
              <Text style={[styles.ruleDetail, { color: theme.textMuted }]} numberOfLines={3}>
                {formatIpRanges(rule.IpRanges || []) || formatIpRanges(rule.Ipv6Ranges || []) || formatIpRanges(rule.UserIdGroupPairs || []) || rd.all}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={`${rd.outboundRules} (${outboundRules.length})`} icon="arrow-up-outline" theme={theme} />
        {outboundRules.length === 0 ? (
          <Text style={[styles.emptySection, { color: theme.textMuted }]}>{rd.noOutboundRules}</Text>
        ) : (
          outboundRules.map((rule: any, i: number) => (
            <View key={i} style={[styles.ruleBlock, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
              <Text style={[styles.ruleTitle, { color: theme.text }]}>
                {rule.IpProtocol === '-1' ? rd.allTraffic : rule.IpProtocol.toUpperCase()} {rule.FromPort === rule.ToPort ? `(${rule.FromPort})` : `(${rule.FromPort}-${rule.ToPort})`}
              </Text>
              <Text style={[styles.ruleDetail, { color: theme.textMuted }]} numberOfLines={3}>
                {formatIpRanges(rule.IpRanges || []) || formatIpRanges(rule.Ipv6Ranges || []) || formatIpRanges(rule.UserIdGroupPairs || []) || rd.all}
              </Text>
            </View>
          ))
        )}
      </View>
    </>
  );
}

function renderONTAPDetail(item: any, theme: any, t: any, rd: any) {
  const isAvailable = item.Lifecycle === 'AVAILABLE';

  return (
    <>
      <View style={[styles.heroCard, { backgroundColor: theme.bgCard }, SHADOWS.md]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroName, { color: theme.text }]}>{item.FileSystemId}</Text>
            <Text style={[styles.heroArn, { color: theme.textMuted }]} numberOfLines={1}>{item.ResourceARN}</Text>
          </View>
          <StatusBadge status={item.Lifecycle || ''} isGood={isAvailable} theme={theme} />
        </View>
        <View style={styles.heroGrid}>
          <HeroStat label={rd.type} value={item.FileSystemType} theme={theme} />
          <HeroStat label={rd.storage} value={`${item.StorageCapacity || 0} ${rd.gib}`} theme={theme} />
          <HeroStat label={rd.storageType} value={item.StorageType || ''} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.network} icon="globe-outline" theme={theme} />
        <DetailRow label={rd.dnsName} value={item.DNSName} theme={theme} />
        <DetailRow label={rd.vpcId} value={item.VpcId} theme={theme} />
        {item.SubnetIds?.map((s: string, i: number) => (
          <DetailRow key={i} label={`${rd.subnets} ${i + 1}`} value={s} theme={theme} />
        ))}
        <DetailRow label={rd.securityGroups} value={item.NetworkInterfaceIds?.join(', ')} theme={theme} />
        <DetailRow label={rd.availabilityZone} value={item.AvailabilityZoneIds?.join(', ')} theme={theme} />
        <DetailRow label={rd.preferredSubnet} value={item.WindowsConfiguration?.PreferredSubnetId} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.configuration} icon="settings-outline" theme={theme} />
        <DetailRow label={rd.fileSystemType} value={item.FileSystemType} theme={theme} />
        <DetailRow label={rd.storageCapacity} value={`${item.StorageCapacity || 0} ${rd.gib}`} theme={theme} />
        <DetailRow label={rd.storageType} value={item.StorageType} theme={theme} />
        <DetailRow label={rd.provisionedIops} value={item.ProvisionedIops} theme={theme} />
        <DetailRow label={rd.throughputCapacity} value={item.ThroughputCapacity ? `${item.ThroughputCapacity} ${rd.mbps}` : ''} theme={theme} />
        <DetailRow label={rd.deploymentType} value={item.WindowsConfiguration?.DeploymentType} theme={theme} />
        <DetailRow label={rd.dailyBackupStart} value={item.WindowsConfiguration?.DailyAutomaticBackupStartTime} theme={theme} />
        <DetailRow label={rd.weeklyMaintenance} value={item.WindowsConfiguration?.WeeklyMaintenanceStartTime} theme={theme} />
        <DetailRow label={rd.copyTags} value={item.WindowsConfiguration?.CopyTagsToBackups ? rd.yes : rd.no} theme={theme} />
        <DetailRow label={rd.kmsKeyId} value={item.KmsKeyId} theme={theme} />
        <DetailRow label={rd.createdAt} value={item.CreationTime ? new Date(item.CreationTime).toLocaleString() : ''} theme={theme} />
      </View>

      {item.OntapConfiguration && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={rd.ontapConfiguration} icon="hardware-chip-outline" theme={theme} />
          <DetailRow label={rd.deploymentType} value={item.OntapConfiguration.DeploymentType} theme={theme} />
          <DetailRow label={rd.endpointIpRange} value={item.OntapConfiguration.EndpointIpAddressRange} theme={theme} />
          <DetailRow label={rd.preferredSubnet} value={item.OntapConfiguration.PreferredSubnetId} theme={theme} />
          <DetailRow label={rd.routeTableIds} value={item.OntapConfiguration.RouteTableIds?.join(', ')} theme={theme} />
          <DetailRow label={rd.throughputCapacity} value={item.OntapConfiguration.ThroughputCapacity ? `${item.OntapConfiguration.ThroughputCapacity} ${rd.mbps}` : ''} theme={theme} />
          <DetailRow label={rd.weeklyMaintenance} value={item.OntapConfiguration.WeeklyMaintenanceStartTime} theme={theme} />
          <DetailRow label={rd.dailyBackupStart} value={item.OntapConfiguration.DailyAutomaticBackupStartTime} theme={theme} />
          <DetailRow label={rd.automaticBackups} value={item.OntapConfiguration.AutomaticBackupRetentionDays ? `${item.OntapConfiguration.AutomaticBackupRetentionDays} ${rd.days}` : rd.disabled} theme={theme} />
          {item.OntapConfiguration.DiskIopsConfiguration && (
            <>
              <DetailRow label={rd.diskIopsMode} value={item.OntapConfiguration.DiskIopsConfiguration.Mode} theme={theme} />
              <DetailRow label={rd.diskIops} value={item.OntapConfiguration.DiskIopsConfiguration.Iops} theme={theme} />
            </>
          )}
        </View>
      )}

      {item.AdministrativeActions?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={`${rd.administrativeActions} (${item.AdministrativeActions.length})`} icon="construct-outline" theme={theme} />
          {item.AdministrativeActions.map((a: any, i: number) => (
            <DetailRow key={i} label={a.AdministrativeActionType} value={`${a.Status} | ${a.ProgressPercent ?? 0}%`} theme={theme} />
          ))}
        </View>
      )}
    </>
  );
}

function renderS3Detail(item: any, theme: any, t: any, rd: any) {
  return (
    <>
      <View style={[styles.heroCard, { backgroundColor: theme.bgCard }, SHADOWS.md]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroName, { color: theme.text }]}>{item.Name}</Text>
            <Text style={[styles.heroArn, { color: theme.textMuted }]} numberOfLines={1}>
              s3://{item.Name}
            </Text>
          </View>
        </View>
        <View style={styles.heroGrid}>
          <HeroStat label={rd.region} value={item.BucketRegion || 'us-east-1'} theme={theme} />
          <HeroStat label={rd.createdAt} value={item.CreationDate ? new Date(item.CreationDate).toLocaleDateString() : ''} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.general} icon="information-circle-outline" theme={theme} />
        <DetailRow label={rd.bucketName} value={item.Name} theme={theme} />
        <DetailRow label={rd.region} value={item.BucketRegion} theme={theme} />
        <DetailRow label={rd.creationDate} value={item.CreationDate ? new Date(item.CreationDate).toLocaleString() : ''} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={rd.access} icon="lock-closed-outline" theme={theme} />
        <DetailRow label={rd.blockPublicAccess} value={item.PublicAccessBlockConfiguration ? rd.configured : rd.notConfigured} theme={theme} />
        <DetailRow label={rd.objectOwnership} value={item.OwnershipControls?.Rules?.[0]?.ObjectOwnership || rd.bucketOwnerEnforced} theme={theme} />
      </View>

      {item.Tags?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={`${rd.tags} (${item.Tags.length})`} icon="pricetags-outline" theme={theme} />
          {item.Tags.map((tg: any, i: number) => (
            <DetailRow key={i} label={tg.Key} value={tg.Value} theme={theme} />
          ))}
        </View>
      )}
    </>
  );
}

function HeroStat({ label, value, theme }: { label: string; value: any; theme: any }) {
  return (
    <View style={styles.heroStat}>
      <Text style={[styles.heroStatVal, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.heroStatLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function ResourceDetailScreen({ resourceType, item, onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rd = t('resourceDetail', { returnObjects: true }) as any;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    Logger.info(TAG, `ResourceDetail opened: ${resourceType}`, { id: item?.DBInstanceIdentifier || item?.CacheClusterId || item?.LoadBalancerName || item?.GroupId || item?.FileSystemId });
  }, []);

  const renderDetail = () => {
    switch (resourceType) {
      case 'rds': return renderRDSDetail(item, theme, t, rd);
      case 'elasticache': return renderElastiCacheDetail(item, theme, t, rd);
      case 'lb': return renderLBDetail(item, theme, t, rd);
      case 'sg': return renderSGDetail(item, theme, t, rd);
      case 'ontap': return renderONTAPDetail(item, theme, t, rd);
      case 's3': return renderS3Detail(item, theme, t, rd);
      default: return null;
    }
  };

  const getTitle = () => {
    switch (resourceType) {
      case 'rds': return item?.DBInstanceIdentifier || '';
      case 'elasticache': return item?.CacheClusterId || '';
      case 'lb': return item?.LoadBalancerName || '';
      case 'sg': return item?.GroupName || '';
      case 'ontap': return item?.FileSystemId || '';
      case 's3': return item?.Name || '';
      default: return '';
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.bg, opacity: fadeAnim }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backBtn, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{getTitle()}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderDetail()}
        <View style={{ height: SPACING.huge }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { ...TYPOGRAPHY.bodyBold },
  headerTitle: { ...TYPOGRAPHY.title, flex: 1, textAlign: 'center' },
  scrollContent: { padding: SPACING.md, paddingTop: SPACING.sm },
  heroCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  heroName: { ...TYPOGRAPHY.h3 },
  heroArn: { ...TYPOGRAPHY.monoSm, marginTop: 2 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  heroBadgeText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  heroGrid: { flexDirection: 'row', gap: SPACING.md },
  heroStat: { flex: 1 },
  heroStatVal: { ...TYPOGRAPHY.h3, fontSize: 16 },
  heroStatLabel: { ...TYPOGRAPHY.caption, marginTop: 2 },
  card: { borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.md, ...SHADOWS.sm },
  section: { flexDirection: 'row', alignItems: 'center', paddingBottom: SPACING.md, marginBottom: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionText: { ...TYPOGRAPHY.label },
  detailRow: { flexDirection: 'row', paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,160,0.08)' },
  detailLabel: { ...TYPOGRAPHY.caption, width: 140, flexShrink: 0, marginRight: SPACING.md },
  detailVal: { ...TYPOGRAPHY.body, flex: 1 },
  ruleBlock: { borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, padding: SPACING.md, marginBottom: SPACING.sm },
  ruleTitle: { ...TYPOGRAPHY.bodyBold, marginBottom: SPACING.xs },
  ruleDetail: { ...TYPOGRAPHY.monoSm },
  emptySection: { ...TYPOGRAPHY.caption, textAlign: 'center', paddingVertical: SPACING.lg },
});
