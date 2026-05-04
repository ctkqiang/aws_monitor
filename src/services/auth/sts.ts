import { STSClient, GetSessionTokenCommand } from '@aws-sdk/client-sts';
import { useAuthStore } from '@/stores/authStore';

export interface LoginParams {
  region: string;
  accountId: string;
  iamUsername: string;
  accessKeyId: string;
  secretAccessKey: string;
  mfaCode: string;
}

export async function signInWithAws(params: LoginParams): Promise<void> {
  if (!params.accountId || !params.iamUsername) {
    throw new Error('Account ID and IAM Username are required for MFA.');
  }

  const mfaSerial = `arn:aws:iam::${params.accountId}:mfa/${params.iamUsername}`;

  const stsClient = new STSClient({
    region: params.region,
    credentials: {
      accessKeyId: params.accessKeyId,
      secretAccessKey: params.secretAccessKey,
    },
  });

  const command = new GetSessionTokenCommand({
    DurationSeconds: 43200,
    SerialNumber: mfaSerial,
    TokenCode: params.mfaCode,
  });

  const response = await stsClient.send(command);

  if (!response.Credentials) {
    throw new Error('Failed to get temporary credentials from STS.');
  }

  useAuthStore.getState().setCredentials({
    accessKeyId: response.Credentials.AccessKeyId!,
    secretAccessKey: response.Credentials.SecretAccessKey!,
    sessionToken: response.Credentials.SessionToken!,
    expiration: response.Credentials.Expiration,
  });

  useAuthStore.getState().setRegion(params.region);
}

export function signOut() {
  useAuthStore.getState().signOut();
}
