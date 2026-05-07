import { useQuery } from '@tanstack/react-query';
import {
  IAMClient, GetUserCommand, ListRolesCommand, ListUsersCommand,
  type Role, type User,
} from '@aws-sdk/client-iam';
import { STSClient, GetCallerIdentityCommand as STSGetCallerIdentity } from '@aws-sdk/client-sts';
import { createAwsConfigForService } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'IAM';

export interface IamUser {
  username: string;
  status: string;
  accountId: string;
  arn: string;
}

export interface IamRoleEntry {
  RoleName: string;
  Arn: string;
  CreateDate?: Date;
  LastUsedDate?: Date;
  Description?: string;
}

export interface IamUserEntry {
  UserName: string;
  Arn: string;
  CreateDate?: Date;
  PasswordLastUsed?: Date;
  LastUsedDate?: Date;
}

async function resolveUser(): Promise<IamUser> {
  const config = createAwsConfigForService();
  try {
    const sts = new STSClient(config);
    const stsRes = await sts.send(new STSGetCallerIdentity({}));
    const arn = stsRes.Arn || '';
    const accountId = stsRes.Account || '';

    let username = arn.split('/').pop() || arn.split(':').pop() || 'AWS User';
    let status = 'active';

    try {
      const iam = new IAMClient(config);
      const userRes = await iam.send(new GetUserCommand({}));
      username = userRes.User?.UserName || username;
      status = 'active';
    } catch (e: any) {
      if (e?.name === 'AccessDenied' || e?.name === 'AccessDeniedException') {
        Logger.warn(TAG, '获取 IAM 用户信息失败', { error: e.message });
      }
    }

    Logger.info(TAG, '用户信息已解析', { username, status, accountId });
    return { username, status, accountId, arn };
  } catch (e: any) {
    Logger.warn(TAG, '获取 STS 身份信息失败', { error: e.message });
    return { username: 'AWS User', status: 'unknown', accountId: '', arn: '' };
  }
}

export function useCurrentUser() {
  return useQuery<IamUser>({
    queryKey: ['iam-user'],
    queryFn: resolveUser,
    staleTime: 300000,
    retry: 1,
  });
}

async function fetchRoles(): Promise<IamRoleEntry[]> {
  const config = createAwsConfigForService();
  const client = new IAMClient(config);
  try {
    const res = await client.send(new ListRolesCommand({ MaxItems: 200 }));
    const roles = (res.Roles || []).map((r: Role) => ({
      RoleName: r.RoleName || '',
      Arn: r.Arn || '',
      CreateDate: r.CreateDate,
      LastUsedDate: (r as any).RoleLastUsed?.LastUsedDate,
      Description: r.Description,
    }));
    Logger.info(TAG, `获取到 ${roles.length} 个 IAM 角色`);
    return roles;
  } catch (e: any) {
    Logger.warn(TAG, '获取 IAM 角色失败', { error: e.message });
    return [];
  }
}

export function useIAMRoles() {
  return useQuery<IamRoleEntry[]>({
    queryKey: ['iam-roles'],
    queryFn: fetchRoles,
    staleTime: 120000,
    retry: 1,
  });
}

async function fetchUsers(): Promise<IamUserEntry[]> {
  const config = createAwsConfigForService();
  const client = new IAMClient(config);
  try {
    const res = await client.send(new ListUsersCommand({ MaxItems: 200 }));
    const users = (res.Users || []).map((u: User) => ({
      UserName: u.UserName || '',
      Arn: u.Arn || '',
      CreateDate: u.CreateDate,
      PasswordLastUsed: u.PasswordLastUsed,
    }));
    Logger.info(TAG, `获取到 ${users.length} 个 IAM 用户`);
    return users;
  } catch (e: any) {
    Logger.warn(TAG, '获取 IAM 用户列表失败', { error: e.message });
    return [];
  }
}

export function useIAMUsers() {
  return useQuery<IamUserEntry[]>({
    queryKey: ['iam-users'],
    queryFn: fetchUsers,
    staleTime: 120000,
    retry: 1,
  });
}
