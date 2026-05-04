import { authorize, revoke, AuthConfiguration } from 'react-native-app-auth';
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';
import { env, isConfigValid } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';

const oauthConfig: AuthConfiguration = {
  issuer: 'https://www.amazon.com',
  clientId: env.amazonOAuthClientId,
  redirectUrl: env.amazonOAuthRedirectUri,
  scopes: env.amazonOAuthScopes,
  serviceConfiguration: {
    authorizationEndpoint: 'https://www.amazon.com/ap/oa',
    tokenEndpoint: 'https://api.amazon.com/auth/o2/token',
    revocationEndpoint: 'https://api.amazon.com/auth/o2/revoke',
  },
  usePKCE: true,
  additionalParameters: {},
};

export async function signInWithAmazon(): Promise<void> {
  if (!isConfigValid()) {
    throw new Error('Configuration missing. Please set up .env file.');
  }

  const authState = await authorize(oauthConfig);

  if (!authState.accessToken) {
    throw new Error('No access token received from Amazon OAuth.');
  }

  const cognitoClient = new CognitoIdentityClient({ region: env.awsRegion });

  const idResponse = await cognitoClient.send(new GetIdCommand({
    IdentityPoolId: env.cognitoIdentityPoolId,
    Logins: { 'www.amazon.com': authState.accessToken },
  }));

  if (!idResponse.IdentityId) {
    throw new Error('Failed to get identity ID from Cognito.');
  }

  const credsResponse = await cognitoClient.send(new GetCredentialsForIdentityCommand({
    IdentityId: idResponse.IdentityId,
    Logins: { 'www.amazon.com': authState.accessToken },
  }));

  if (!credsResponse.Credentials) {
    throw new Error('Failed to get credentials from Cognito.');
  }

  useAuthStore.getState().setCredentials(
    {
      accessKeyId: credsResponse.Credentials.AccessKeyId!,
      secretAccessKey: credsResponse.Credentials.SecretKey!,
      sessionToken: credsResponse.Credentials.SessionToken!,
      expiration: credsResponse.Credentials.Expiration,
    },
    idResponse.IdentityId
  );
}

export async function signOutFromAmazon(): Promise<void> {
  try {
    const { credentials } = useAuthStore.getState();
    if (credentials?.accessKeyId) {
      await revoke(oauthConfig, {
        tokenToRevoke: credentials.accessKeyId,
        includeBasicAuth: false,
        sendClientId: true,
      });
    }
  } catch {
    // Ignore revocation errors
  }
  useAuthStore.getState().signOut();
}
