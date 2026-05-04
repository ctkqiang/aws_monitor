import { useAuthStore } from '@/stores/authStore';

export interface LoginParams {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export async function signInWithAws(params: LoginParams): Promise<void> {
  const region = params.region?.trim() || 'us-east-1';
  const keyId = params.accessKeyId?.trim();
  const secret = params.secretAccessKey?.trim();

  if (!keyId || !secret) {
    throw new Error('Access Key ID and Secret Access Key are required.');
  }

  if (!keyId.startsWith('AKIA')) {
    throw new Error('Invalid Access Key ID format. IAM access keys start with "AKIA".');
  }

  if (secret.length < 16) {
    throw new Error('Secret Access Key appears too short. Please verify.');
  }

  useAuthStore.getState().setCredentials({
    accessKeyId: keyId,
    secretAccessKey: secret,
  });

  useAuthStore.getState().setRegion(region);
}

export function signOut() {
  useAuthStore.getState().signOut();
}
