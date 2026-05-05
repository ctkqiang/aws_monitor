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

function renderRDSDetail(item: any, theme: any) {
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
          <HeroStat label="Engine" value={`${item.Engine} ${item.EngineVersion}`} theme={theme} />
          <HeroStat label="Class" value={item.DBInstanceClass} theme={theme} />
          <HeroStat label="Storage" value={`${item.AllocatedStorage || 0} GiB (${item.StorageType || ''})`} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Connectivity" icon="globe-outline" theme={theme} />
        <DetailRow label="Endpoint" value={endpoint ? `${endpoint.Address}:${endpoint.Port}` : ''} theme={theme} />
        <DetailRow label="Port" value={endpoint?.Port} theme={theme} />
        <DetailRow label="Multi-AZ" value={item.MultiAZ ? 'Yes' : 'No'} theme={theme} />
        <DetailRow label="Publicly Accessible" value={item.PubliclyAccessible ? 'Yes' : 'No'} theme={theme} />
        <DetailRow label="VPC ID" value={item.DBSubnetGroup?.VpcId} theme={theme} />
        <DetailRow label="Subnet Group" value={subnet?.DBSubnetGroupName} theme={theme} />
        <DetailRow label="Subnets" value={subnet?.Subnets?.map((s: any) => s.SubnetIdentifier).join(', ')} theme={theme} />
        <DetailRow label="Security Groups" value={secGroups} theme={theme} />
        <DetailRow label="Availability Zone" value={item.AvailabilityZone} theme={theme} />
        {item.SecondaryAvailabilityZone ? (
          <DetailRow label="Secondary AZ" value={item.SecondaryAvailabilityZone} theme={theme} />
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Configuration" icon="settings-outline" theme={theme} />
        <DetailRow label="Engine" value={item.Engine} theme={theme} />
        <DetailRow label="Engine Version" value={item.EngineVersion} theme={theme} />
        <DetailRow label="DB Instance Class" value={item.DBInstanceClass} theme={theme} />
        <DetailRow label="Allocated Storage" value={`${item.AllocatedStorage || 0} GiB`} theme={theme} />
        <DetailRow label="Storage Type" value={item.StorageType} theme={theme} />
        <DetailRow label="IOPS" value={item.Iops} theme={theme} />
        <DetailRow label="Max Allocated Storage" value={item.MaxAllocatedStorage ? `${item.MaxAllocatedStorage} GiB` : ''} theme={theme} />
        <DetailRow label="Storage Encrypted" value={item.StorageEncrypted ? 'Yes' : 'No'} theme={theme} />
        <DetailRow label="KMS Key ID" value={item.KmsKeyId} theme={theme} />
        <DetailRow label="License Model" value={item.LicenseModel} theme={theme} />
        <DetailRow label="Backup Retention" value={item.BackupRetentionPeriod ? `${item.BackupRetentionPeriod} days` : ''} theme={theme} />
        <DetailRow label="Backup Window" value={item.PreferredBackupWindow} theme={theme} />
        <DetailRow label="Maintenance Window" value={item.PreferredMaintenanceWindow} theme={theme} />
        <DetailRow label="Auto Minor Upgrade" value={item.AutoMinorVersionUpgrade ? 'Yes' : 'No'} theme={theme} />
        <DetailRow label="Deletion Protection" value={item.DeletionProtection ? 'Enabled' : 'Disabled'} theme={theme} />
        <DetailRow label="Copy Tags to Snapshots" value={item.CopyTagsToSnapshot ? 'Yes' : 'No'} theme={theme} />
        <DetailRow label="Parameter Groups" value={parameterGroups} theme={theme} />
        <DetailRow label="Option Groups" value={optionGroups} theme={theme} />
        <DetailRow label="IAM DB Auth" value={item.IAMDatabaseAuthenticationEnabled ? 'Enabled' : 'Disabled'} theme={theme} />
        <DetailRow label="Performance Insights" value={item.PerformanceInsightsEnabled ? 'Enabled' : 'Disabled'} theme={theme} />
        <DetailRow label="CA Certificate" value={item.CACertificateIdentifier} theme={theme} />
        <DetailRow label="Created At" value={item.InstanceCreateTime ? new Date(item.InstanceCreateTime).toLocaleString() : ''} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Status & Monitoring" icon="pulse-outline" theme={theme} />
        <DetailRow label="Status" value={item.DBInstanceStatus} theme={theme} />
        <DetailRow label="Enhanced Monitoring" value={item.MonitoringInterval && item.MonitoringInterval > 0 ? `Every ${item.MonitoringInterval}s` : 'Disabled'} theme={theme} />
        <DetailRow label="Monitoring Role" value={item.MonitoringRoleArn} theme={theme} />
        <DetailRow label="Latest Restorable Time" value={item.LatestRestorableTime ? new Date(item.LatestRestorableTime).toLocaleString() : ''} theme={theme} />
      </View>

      {item.ReadReplicaDBInstanceIdentifiers?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title="Read Replicas" icon="copy-outline" theme={theme} />
          {item.ReadReplicaDBInstanceIdentifiers.map((r: string, i: number) => (
            <DetailRow key={i} label={`Replica ${i + 1}`} value={r} theme={theme} />
          ))}
        </View>
      )}
    </>
  );
}

function renderElastiCacheDetail(item: any, theme: any) {
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
          <HeroStat label="Engine" value={`${item.Engine} ${item.EngineVersion}`} theme={theme} />
          <HeroStat label="Node Type" value={item.CacheNodeType} theme={theme} />
          <HeroStat label="Nodes" value={String(item.NumCacheNodes || 1)} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Connectivity" icon="globe-outline" theme={theme} />
        <DetailRow label="Endpoint" value={endpoint ? `${endpoint.Address}:${endpoint.Port}` : ''} theme={theme} />
        <DetailRow label="Port" value={endpoint?.Port || item.Port} theme={theme} />
        {endpoint?.Address ? null : <DetailRow label="Configuration Endpoint" value={item.ConfigurationEndpoint ? `${item.ConfigurationEndpoint.Address}:${item.ConfigurationEndpoint.Port}` : ''} theme={theme} />}
        <DetailRow label="Cache Subnet Group" value={item.CacheSubnetGroupName} theme={theme} />
        <DetailRow label="Security Groups" value={item.SecurityGroups?.map((sg: any) => sg.SecurityGroupId).join(', ')} theme={theme} />
        <DetailRow label="Availability Zone" value={item.PreferredAvailabilityZone} theme={theme} />
        <DetailRow label="Multi-AZ" value={item.MultiAZ} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Configuration" icon="settings-outline" theme={theme} />
        <DetailRow label="Engine" value={item.Engine} theme={theme} />
        <DetailRow label="Engine Version" value={item.EngineVersion} theme={theme} />
        <DetailRow label="Node Type" value={item.CacheNodeType} theme={theme} />
        <DetailRow label="Num Nodes" value={item.NumCacheNodes} theme={theme} />
        <DetailRow label="Cache Parameter Group" value={item.CacheParameterGroup?.CacheParameterGroupName} theme={theme} />
        <DetailRow label="Parameter Apply Status" value={item.CacheParameterGroup?.ParameterApplyStatus} theme={theme} />
        <DetailRow label="Snapshot Retention" value={item.SnapshotRetentionLimit ? `${item.SnapshotRetentionLimit} days` : ''} theme={theme} />
        <DetailRow label="Snapshot Window" value={item.SnapshotWindow} theme={theme} />
        <DetailRow label="Maintenance Window" value={item.PreferredMaintenanceWindow} theme={theme} />
        <DetailRow label="Auto Minor Upgrade" value={item.AutoMinorVersionUpgrade ? 'Yes' : 'No'} theme={theme} />
        <DetailRow label="At-Rest Encryption" value={item.AtRestEncryptionEnabled ? 'Enabled' : 'Disabled'} theme={theme} />
        <DetailRow label="Transit Encryption" value={item.TransitEncryptionEnabled ? 'Enabled' : 'Disabled'} theme={theme} />
        <DetailRow label="Auth Token" value={item.AuthTokenEnabled ? 'Enabled' : 'Disabled'} theme={theme} />
        <DetailRow label="Notification Config" value={item.NotificationConfiguration?.TopicArn} theme={theme} />
        <DetailRow label="Created At" value={item.CacheClusterCreateTime ? new Date(item.CacheClusterCreateTime).toLocaleString() : ''} theme={theme} />
      </View>
    </>
  );
}

function renderLBDetail(item: any, theme: any) {
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
          <HeroStat label="Type" value={item.Type} theme={theme} />
          <HeroStat label="Scheme" value={item.Scheme || ''} theme={theme} />
          <HeroStat label="DNS" value={item.DNSName || ''} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Network" icon="globe-outline" theme={theme} />
        <DetailRow label="DNS Name" value={item.DNSName} theme={theme} />
        <DetailRow label="Canonical Hosted Zone" value={item.CanonicalHostedZoneId} theme={theme} />
        <DetailRow label="VPC ID" value={item.VpcId} theme={theme} />
        <DetailRow label="Availability Zones" value={azs} theme={theme} />
        {item.SubnetIds?.map((s: string, i: number) => (
          <DetailRow key={i} label={`Subnet ${i + 1}`} value={s} theme={theme} />
        ))}
        <DetailRow label="Security Groups" value={item.SecurityGroups?.join(', ')} theme={theme} />
        <DetailRow label="IP Address Type" value={item.IpAddressType} theme={theme} />
        <DetailRow label="Customer Owned IPv4 Pool" value={item.CustomerOwnedIpv4Pool} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Configuration" icon="settings-outline" theme={theme} />
        <DetailRow label="Type" value={item.Type} theme={theme} />
        <DetailRow label="Scheme" value={item.Scheme} theme={theme} />
        <DetailRow label="State" value={item.State?.Code} theme={theme} />
        <DetailRow label="State Reason" value={item.State?.Reason} theme={theme} />
        <DetailRow label="Deletion Protection" value={item.Attributes?.find((a: any) => a.Key === 'deletion_protection.enabled')?.Value === 'true' ? 'Enabled' : 'Disabled'} theme={theme} />
        <DetailRow label="Idle Timeout" value={item.Attributes?.find((a: any) => a.Key === 'idle_timeout.timeout_seconds')?.Value ? `${item.Attributes?.find((a: any) => a.Key === 'idle_timeout.timeout_seconds').Value}s` : ''} theme={theme} />
        <DetailRow label="HTTP/2" value={item.Attributes?.find((a: any) => a.Key === 'routing.http2.enabled')?.Value === 'true' ? 'Enabled' : 'Disabled'} theme={theme} />
        <DetailRow label="Drop Invalid Headers" value={item.Attributes?.find((a: any) => a.Key === 'routing.http.drop_invalid_header_fields.enabled')?.Value === 'true' ? 'Yes' : 'No'} theme={theme} />
        <DetailRow label="Created At" value={item.CreatedTime ? new Date(item.CreatedTime).toLocaleString() : ''} theme={theme} />
      </View>

      {item.Listeners?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={`Listeners (${item.Listeners.length})`} icon="headset-outline" theme={theme} />
          {item.Listeners.map((l: any, i: number) => (
            <DetailRow key={i} label={`Port ${l.Port} (${l.Protocol})`} value={`→ ${l.DefaultActions?.[0]?.TargetGroupArn?.split('/').pop() || l.DefaultActions?.[0]?.Type}`} theme={theme} />
          ))}
        </View>
      )}
    </>
  );
}

function renderSGDetail(item: any, theme: any) {
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
          <HeroStat label="Inbound Rules" value={String(inboundRules.length)} theme={theme} />
          <HeroStat label="Outbound Rules" value={String(outboundRules.length)} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="General" icon="information-circle-outline" theme={theme} />
        <DetailRow label="Group ID" value={item.GroupId} theme={theme} />
        <DetailRow label="Group Name" value={item.GroupName} theme={theme} />
        <DetailRow label="Description" value={item.Description} theme={theme} />
        <DetailRow label="VPC ID" value={item.VpcId} theme={theme} />
        <DetailRow label="Owner ID" value={item.OwnerId} theme={theme} />
      </View>

      {item.Tags?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={`Tags (${item.Tags.length})`} icon="pricetags-outline" theme={theme} />
          {item.Tags.map((t: any, i: number) => (
            <DetailRow key={i} label={t.Key} value={t.Value} theme={theme} />
          ))}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={`Inbound Rules (${inboundRules.length})`} icon="arrow-down-outline" theme={theme} />
        {inboundRules.length === 0 ? (
          <Text style={[styles.emptySection, { color: theme.textMuted }]}>No inbound rules</Text>
        ) : (
          inboundRules.map((rule: any, i: number) => (
            <View key={i} style={[styles.ruleBlock, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
              <Text style={[styles.ruleTitle, { color: theme.text }]}>
                {rule.IpProtocol === '-1' ? 'All traffic' : rule.IpProtocol.toUpperCase()} {rule.FromPort === rule.ToPort ? `(${rule.FromPort})` : `(${rule.FromPort}-${rule.ToPort})`}
              </Text>
              <Text style={[styles.ruleDetail, { color: theme.textMuted }]} numberOfLines={3}>
                {formatIpRanges(rule.IpRanges || []) || formatIpRanges(rule.Ipv6Ranges || []) || formatIpRanges(rule.UserIdGroupPairs || []) || 'All'}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title={`Outbound Rules (${outboundRules.length})`} icon="arrow-up-outline" theme={theme} />
        {outboundRules.length === 0 ? (
          <Text style={[styles.emptySection, { color: theme.textMuted }]}>No outbound rules</Text>
        ) : (
          outboundRules.map((rule: any, i: number) => (
            <View key={i} style={[styles.ruleBlock, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
              <Text style={[styles.ruleTitle, { color: theme.text }]}>
                {rule.IpProtocol === '-1' ? 'All traffic' : rule.IpProtocol.toUpperCase()} {rule.FromPort === rule.ToPort ? `(${rule.FromPort})` : `(${rule.FromPort}-${rule.ToPort})`}
              </Text>
              <Text style={[styles.ruleDetail, { color: theme.textMuted }]} numberOfLines={3}>
                {formatIpRanges(rule.IpRanges || []) || formatIpRanges(rule.Ipv6Ranges || []) || formatIpRanges(rule.UserIdGroupPairs || []) || 'All'}
              </Text>
            </View>
          ))
        )}
      </View>
    </>
  );
}

function renderONTAPDetail(item: any, theme: any) {
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
          <HeroStat label="Type" value={item.FileSystemType} theme={theme} />
          <HeroStat label="Storage" value={`${item.StorageCapacity || 0} GiB`} theme={theme} />
          <HeroStat label="Storage Type" value={item.StorageType || ''} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Network" icon="globe-outline" theme={theme} />
        <DetailRow label="DNS Name" value={item.DNSName} theme={theme} />
        <DetailRow label="VPC ID" value={item.VpcId} theme={theme} />
        {item.SubnetIds?.map((s: string, i: number) => (
          <DetailRow key={i} label={`Subnet ${i + 1}`} value={s} theme={theme} />
        ))}
        <DetailRow label="Security Groups" value={item.NetworkInterfaceIds?.join(', ')} theme={theme} />
        <DetailRow label="Availability Zone" value={item.AvailabilityZoneIds?.join(', ')} theme={theme} />
        <DetailRow label="Preferred Subnet" value={item.WindowsConfiguration?.PreferredSubnetId} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Configuration" icon="settings-outline" theme={theme} />
        <DetailRow label="File System Type" value={item.FileSystemType} theme={theme} />
        <DetailRow label="Storage Capacity" value={`${item.StorageCapacity || 0} GiB`} theme={theme} />
        <DetailRow label="Storage Type" value={item.StorageType} theme={theme} />
        <DetailRow label="Provisioned IOPS" value={item.ProvisionedIops} theme={theme} />
        <DetailRow label="Throughput Capacity" value={item.ThroughputCapacity ? `${item.ThroughputCapacity} MB/s` : ''} theme={theme} />
        <DetailRow label="Deployment Type" value={item.WindowsConfiguration?.DeploymentType} theme={theme} />
        <DetailRow label="Daily Backup Start" value={item.WindowsConfiguration?.DailyAutomaticBackupStartTime} theme={theme} />
        <DetailRow label="Weekly Maintenance" value={item.WindowsConfiguration?.WeeklyMaintenanceStartTime} theme={theme} />
        <DetailRow label="Copy Tags to Backups" value={item.WindowsConfiguration?.CopyTagsToBackups ? 'Yes' : 'No'} theme={theme} />
        <DetailRow label="KMS Key ID" value={item.KmsKeyId} theme={theme} />
        <DetailRow label="Created At" value={item.CreationTime ? new Date(item.CreationTime).toLocaleString() : ''} theme={theme} />
      </View>

      {item.OntapConfiguration && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title="ONTAP Configuration" icon="hardware-chip-outline" theme={theme} />
          <DetailRow label="Deployment Type" value={item.OntapConfiguration.DeploymentType} theme={theme} />
          <DetailRow label="Endpoint IP Range" value={item.OntapConfiguration.EndpointIpAddressRange} theme={theme} />
          <DetailRow label="Preferred Subnet" value={item.OntapConfiguration.PreferredSubnetId} theme={theme} />
          <DetailRow label="Route Table IDs" value={item.OntapConfiguration.RouteTableIds?.join(', ')} theme={theme} />
          <DetailRow label="Throughput Capacity" value={item.OntapConfiguration.ThroughputCapacity ? `${item.OntapConfiguration.ThroughputCapacity} MB/s` : ''} theme={theme} />
          <DetailRow label="Weekly Maintenance" value={item.OntapConfiguration.WeeklyMaintenanceStartTime} theme={theme} />
          <DetailRow label="Daily Backup Start" value={item.OntapConfiguration.DailyAutomaticBackupStartTime} theme={theme} />
          <DetailRow label="Automatic Backups" value={item.OntapConfiguration.AutomaticBackupRetentionDays ? `${item.OntapConfiguration.AutomaticBackupRetentionDays} days` : 'Disabled'} theme={theme} />
          {item.OntapConfiguration.DiskIopsConfiguration && (
            <>
              <DetailRow label="Disk IOPS Mode" value={item.OntapConfiguration.DiskIopsConfiguration.Mode} theme={theme} />
              <DetailRow label="Disk IOPS" value={item.OntapConfiguration.DiskIopsConfiguration.Iops} theme={theme} />
            </>
          )}
        </View>
      )}

      {item.AdministrativeActions?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={`Administrative Actions (${item.AdministrativeActions.length})`} icon="construct-outline" theme={theme} />
          {item.AdministrativeActions.map((a: any, i: number) => (
            <DetailRow key={i} label={a.AdministrativeActionType} value={`${a.Status} | ${a.ProgressPercent ?? 0}%`} theme={theme} />
          ))}
        </View>
      )}
    </>
  );
}

function renderS3Detail(item: any, theme: any) {
  const formatSize = (bytes?: number) => {
    if (!bytes) return '\u2014';
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

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
          <HeroStat label="Region" value={item.BucketRegion || 'us-east-1'} theme={theme} />
          <HeroStat label="Created" value={item.CreationDate ? new Date(item.CreationDate).toLocaleDateString() : ''} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="General" icon="information-circle-outline" theme={theme} />
        <DetailRow label="Bucket Name" value={item.Name} theme={theme} />
        <DetailRow label="Region" value={item.BucketRegion} theme={theme} />
        <DetailRow label="Creation Date" value={item.CreationDate ? new Date(item.CreationDate).toLocaleString() : ''} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <SectionTitle title="Access" icon="lock-closed-outline" theme={theme} />
        <DetailRow label="Block Public Access" value={item.PublicAccessBlockConfiguration ? 'Configured' : 'Not configured'} theme={theme} />
        <DetailRow label="Object Ownership" value={item.OwnershipControls?.Rules?.[0]?.ObjectOwnership || 'Bucket owner enforced'} theme={theme} />
      </View>

      {item.Tags?.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <SectionTitle title={`Tags (${item.Tags.length})`} icon="pricetags-outline" theme={theme} />
          {item.Tags.map((t: any, i: number) => (
            <DetailRow key={i} label={t.Key} value={t.Value} theme={theme} />
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

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    Logger.info(TAG, `ResourceDetail opened: ${resourceType}`, { id: item?.DBInstanceIdentifier || item?.CacheClusterId || item?.LoadBalancerName || item?.GroupId || item?.FileSystemId });
  }, []);

  const renderDetail = () => {
    switch (resourceType) {
      case 'rds': return renderRDSDetail(item, theme);
      case 'elasticache': return renderElastiCacheDetail(item, theme);
      case 'lb': return renderLBDetail(item, theme);
      case 'sg': return renderSGDetail(item, theme);
      case 'ontap': return renderONTAPDetail(item, theme);
      case 's3': return renderS3Detail(item, theme);
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
            <Text style={[styles.backBtn, { color: theme.accent }]}>Back</Text>
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
