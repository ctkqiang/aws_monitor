import Constants from 'expo-constants';

export interface EnvConfig {
  awsRegion: string;
  cognitoIdentityPoolId: string;
  amazonOAuthClientId: string;
  amazonOAuthRedirectUri: string;
  amazonOAuthScopes: string[];
}

function readConfig(): EnvConfig {
  const extra = Constants.expoConfig?.extra || {};

  const region = (extra.aws_region as string) || 'us-east-1';
  const poolId = (extra.cognito_identity_pool_id as string) || '';
  const clientId = (extra.amazon_oauth_client_id as string) || '';
  const redirectUri = (extra.amazon_oauth_redirect_uri as string) || 'com.awsaudit.awsight:/oauth2callback';
  const scopesStr = (extra.amazon_oauth_scopes as string) || 'profile profile:user_id';
  const scopes = scopesStr.split(/\s+/).filter(Boolean);

  return {
    awsRegion: region,
    cognitoIdentityPoolId: poolId,
    amazonOAuthClientId: clientId,
    amazonOAuthRedirectUri: redirectUri,
    amazonOAuthScopes: scopes,
  };
}

export const env = readConfig();

export function isConfigValid(): boolean {
  return Boolean(
    env.cognitoIdentityPoolId &&
      env.amazonOAuthClientId &&
      env.cognitoIdentityPoolId !== 'your-identity-pool-id' &&
      env.amazonOAuthClientId !== 'your-amazon-oauth-client-id'
  );
}
