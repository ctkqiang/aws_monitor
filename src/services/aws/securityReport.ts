import {
  IAMClient,
  ListUsersCommand,
  ListRolesCommand,
  GetUserCommand,
  GetRoleCommand,
  ListAttachedUserPoliciesCommand,
  ListAttachedRolePoliciesCommand,
  ListUserPoliciesCommand,
  ListRolePoliciesCommand,
  GetUserPolicyCommand,
  GetRolePolicyCommand,
  ListAccessKeysCommand,
  GetAccessKeyLastUsedCommand,
  ListUserTagsCommand,
  ListRoleTagsCommand,
  ListMFADevicesCommand,
} from '@aws-sdk/client-iam';
import {
  SecretsManagerClient,
  ListSecretsCommand,
  DescribeSecretCommand,
  GetResourcePolicyCommand,
  Tag,
} from '@aws-sdk/client-secrets-manager';
import { createAwsConfigForService } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'SecurityReport';

export interface IAMUserPolicy {
  PolicyName: string;
  PolicyDocument: string;
}

export interface IAMManagedPolicy {
  PolicyName: string;
  PolicyArn: string;
  Description?: string;
}

export interface IAMAccessKey {
  AccessKeyId: string;
  Status: string;
  CreateDate: Date;
  LastUsedDate?: Date;
  LastUsedRegion?: string;
  LastUsedService?: string;
}

export interface IAMUserDetail {
  UserName: string;
  Arn: string;
  CreateDate: Date;
  PasswordLastUsed?: Date;
  LastUsedDate?: Date;
  MFAEnabled: boolean;
  AccessKeys: IAMAccessKey[];
  ManagedPolicies: IAMManagedPolicy[];
  InlinePolicies: IAMUserPolicy[];
  PermissionsBoundary?: string;
  Tags: Record<string, string>;
}

export interface IAMRoleDetail {
  RoleName: string;
  Arn: string;
  CreateDate: Date;
  LastUsedDate?: Date;
  Description?: string;
  TrustPolicy: string;
  MaxSessionDuration: number;
  ManagedPolicies: IAMManagedPolicy[];
  InlinePolicies: IAMUserPolicy[];
  PermissionsBoundary?: string;
  Tags: Record<string, string>;
  AssumeRolePrincipals: string[];
}

export interface SecretDetail {
  ARN: string;
  Name: string;
  Description?: string;
  OwningService?: string;
  PrimaryRegion?: string;
  CreatedDate?: Date;
  LastModifiedDate?: Date;
  LastAccessedDate?: Date;
  LastRotatedDate?: Date;
  NextRotationDate?: Date;
  DeletedDate?: Date;
  RotationEnabled: boolean;
  RotationLambdaARN?: string;
  RotationAutomaticallyAfterDays?: number;
  VersionId?: string;
  KmsKeyId?: string;
  ResourcePolicy?: string;
  Tags: Record<string, string>;
  ErrorInfo?: string;
}

export interface SecurityReport {
  GeneratedAt: Date;
  AccountId: string;
  IAMUsers: IAMUserDetail[];
  IAMRoles: IAMRoleDetail[];
  Secrets: SecretDetail[];
  PartialFailures: string[];
}

async function fetchUserDetails(client: IAMClient, userName: string): Promise<IAMUserDetail> {
  const userRes = await client.send(new GetUserCommand({ UserName: userName }));
  const user = userRes.User!;

  const attachedPoliciesRes = await client.send(
    new ListAttachedUserPoliciesCommand({ UserName: userName })
  );
  const managedPolicies: IAMManagedPolicy[] = (attachedPoliciesRes.AttachedPolicies || []).map(
    (p) => ({
      PolicyName: p.PolicyName || '',
      PolicyArn: p.PolicyArn || '',
    })
  );

  const inlinePolicyNamesRes = await client.send(
    new ListUserPoliciesCommand({ UserName: userName })
  );
  const inlinePolicies: IAMUserPolicy[] = [];
  for (const policyName of inlinePolicyNamesRes.PolicyNames || []) {
    const policyRes = await client.send(
      new GetUserPolicyCommand({ UserName: userName, PolicyName: policyName })
    );
    inlinePolicies.push({
      PolicyName: policyName,
      PolicyDocument: decodeURIComponent(policyRes.PolicyDocument || ''),
    });
  }

  const accessKeysRes = await client.send(new ListAccessKeysCommand({ UserName: userName }));
  const accessKeys: IAMAccessKey[] = [];
  for (const key of accessKeysRes.AccessKeyMetadata || []) {
    const lastUsedRes = await client.send(
      new GetAccessKeyLastUsedCommand({ AccessKeyId: key.AccessKeyId })
    );
    accessKeys.push({
      AccessKeyId: key.AccessKeyId || '',
      Status: key.Status || '',
      CreateDate: key.CreateDate!,
      LastUsedDate: lastUsedRes.AccessKeyLastUsed?.LastUsedDate,
      LastUsedRegion: lastUsedRes.AccessKeyLastUsed?.Region,
      LastUsedService: lastUsedRes.AccessKeyLastUsed?.ServiceName,
    });
  }

  let mfaEnabled = false;
  try {
    const mfaRes = await client.send(new ListMFADevicesCommand({ UserName: userName }));
    mfaEnabled = (mfaRes.MFADevices || []).length > 0;
  } catch {
    mfaEnabled = false;
  }

  const tagsRes = await client.send(new ListUserTagsCommand({ UserName: userName }));
  const tags: Record<string, string> = {};
  const tagsResult = (tagsRes as any).Tags || [];
  for (const tag of tagsResult) {
    if (tag.Key && tag.Value) {
      tags[tag.Key] = tag.Value;
    }
  }

  return {
    UserName: user.UserName || '',
    Arn: user.Arn || '',
    CreateDate: user.CreateDate!,
    PasswordLastUsed: user.PasswordLastUsed,
    LastUsedDate: (user as any).UserLastUsed?.LastUsedDate,
    MFAEnabled: mfaEnabled,
    AccessKeys: accessKeys,
    ManagedPolicies: managedPolicies,
    InlinePolicies: inlinePolicies,
    PermissionsBoundary: user.PermissionsBoundary?.PermissionsBoundaryArn,
    Tags: tags,
  };
}

async function fetchRoleDetails(client: IAMClient, roleName: string): Promise<IAMRoleDetail> {
  const roleRes = await client.send(new GetRoleCommand({ RoleName: roleName }));
  const role = roleRes.Role!;

  const attachedPoliciesRes = await client.send(
    new ListAttachedRolePoliciesCommand({ RoleName: roleName })
  );
  const managedPolicies: IAMManagedPolicy[] = (attachedPoliciesRes.AttachedPolicies || []).map(
    (p) => ({
      PolicyName: p.PolicyName || '',
      PolicyArn: p.PolicyArn || '',
    })
  );

  const inlinePolicyNamesRes = await client.send(
    new ListRolePoliciesCommand({ RoleName: roleName })
  );
  const inlinePolicies: IAMUserPolicy[] = [];
  for (const policyName of inlinePolicyNamesRes.PolicyNames || []) {
    const policyRes = await client.send(
      new GetRolePolicyCommand({ RoleName: roleName, PolicyName: policyName })
    );
    inlinePolicies.push({
      PolicyName: policyName,
      PolicyDocument: decodeURIComponent(policyRes.PolicyDocument || ''),
    });
  }

  const tagsRes = await client.send(new ListRoleTagsCommand({ RoleName: roleName }));
  const tags: Record<string, string> = {};
  const tagsResult = (tagsRes as any).Tags || [];
  for (const tag of tagsResult) {
    if (tag.Key && tag.Value) {
      tags[tag.Key] = tag.Value;
    }
  }

  let assumeRolePrincipals: string[] = [];
  try {
    const trustPolicy = JSON.parse(decodeURIComponent(role.AssumeRolePolicyDocument || '{}'));
    const principals = trustPolicy?.Statement?.[0]?.Principal;
    if (typeof principals === 'string') {
      assumeRolePrincipals = [principals];
    } else if (Array.isArray(principals?.AWS) || Array.isArray(principals?.Service)) {
      assumeRolePrincipals = [...(principals?.AWS || []), ...(principals?.Service || [])];
    } else if (principals?.AWS) {
      assumeRolePrincipals = [principals.AWS];
    } else if (principals?.Service) {
      assumeRolePrincipals = [principals.Service];
    }
  } catch {
    assumeRolePrincipals = [];
  }

  return {
    RoleName: role.RoleName || '',
    Arn: role.Arn || '',
    CreateDate: role.CreateDate!,
    LastUsedDate: (role as any).RoleLastUsed?.LastUsedDate,
    Description: role.Description,
    TrustPolicy: decodeURIComponent(role.AssumeRolePolicyDocument || ''),
    MaxSessionDuration: role.MaxSessionDuration || 3600,
    ManagedPolicies: managedPolicies,
    InlinePolicies: inlinePolicies,
    PermissionsBoundary: role.PermissionsBoundary?.PermissionsBoundaryArn,
    Tags: tags,
    AssumeRolePrincipals: assumeRolePrincipals,
  };
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

async function fetchSecretDetails(
  client: SecretsManagerClient,
  secretArn: string,
  secretName: string,
): Promise<SecretDetail> {
  try {
    const describeRes = await client.send(new DescribeSecretCommand({ SecretId: secretArn }));

    let resourcePolicy: string | undefined;
    try {
      const policyRes = await client.send(new GetResourcePolicyCommand({ SecretId: secretArn }));
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
      ARN: describeRes.ARN || secretArn,
      Name: describeRes.Name || secretName,
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
  } catch (e: any) {
    const errorMessage = e.message || String(e);
    Logger.warn(TAG, `获取 Secret ${secretName} 详情失败，返回最小信息`, { error: errorMessage });

    return {
      ARN: secretArn,
      Name: secretName,
      RotationEnabled: false,
      Tags: {},
      ErrorInfo: errorMessage,
    };
  }
}

export async function generateSecurityReport(): Promise<SecurityReport> {
  const config = createAwsConfigForService();
  const iamClient = new IAMClient(config);
  const secretsClient = new SecretsManagerClient(config);
  const partialFailures: string[] = [];

  try {
    const usersRes = await iamClient.send(new ListUsersCommand({ MaxItems: 200 }));
    const users: IAMUserDetail[] = [];
    for (const user of usersRes.Users || []) {
      try {
        const details = await fetchUserDetails(iamClient, user.UserName || '');
        users.push(details);
      } catch (e: any) {
        const msg = `获取用户 ${user.UserName} 详情失败: ${e.message}`;
        Logger.warn(TAG, msg, { error: e.message });
        partialFailures.push(msg);
      }
    }

    const rolesRes = await iamClient.send(new ListRolesCommand({ MaxItems: 200 }));
    const roles: IAMRoleDetail[] = [];
    for (const role of rolesRes.Roles || []) {
      try {
        const details = await fetchRoleDetails(iamClient, role.RoleName || '');
        roles.push(details);
      } catch (e: any) {
        const msg = `获取角色 ${role.RoleName} 详情失败: ${e.message}`;
        Logger.warn(TAG, msg, { error: e.message });
        partialFailures.push(msg);
      }
    }

    const secretsRes = await secretsClient.send(new ListSecretsCommand({ MaxResults: 100 }));
    const secrets: SecretDetail[] = [];
    for (const secret of secretsRes.SecretList || []) {
      const details = await fetchSecretDetails(
        secretsClient,
        secret.ARN || '',
        secret.Name || '',
      );
      secrets.push(details);
      if (details.ErrorInfo) {
        partialFailures.push(`Secret ${secret.Name}: ${details.ErrorInfo}`);
      }
    }

    const credentials = config.credentials as { accessKeyId: string };
    const accountId = credentials?.accessKeyId?.split('AKIA')[1]?.substring(0, 12) || 'Unknown';

    Logger.info(TAG, '安全报告生成完成', {
      users: users.length,
      roles: roles.length,
      secrets: secrets.length,
      partialFailures: partialFailures.length,
    });

    return {
      GeneratedAt: new Date(),
      AccountId: accountId,
      IAMUsers: users,
      IAMRoles: roles,
      Secrets: secrets,
      PartialFailures: partialFailures,
    };
  } catch (e: any) {
    Logger.error(TAG, '生成安全报告失败', { error: e.message });
    throw e;
  }
}
