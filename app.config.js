const path = require('path');

function readEnvFile() {
  const fs = require('fs');
  const envPath = path.resolve(__dirname, '.env');
  const result = {};

  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      result[key] = value;
    }
  } catch {
    // .env file not found, use defaults
  }

  return result;
}

const env = readEnvFile();

module.exports = ({ config }) => {
  config.extra = config.extra || {};

  config.extra.aws_region = env.AWS_REGION || 'us-east-1';
  config.extra.cognito_identity_pool_id = env.COGNITO_IDENTITY_POOL_ID || '';
  config.extra.amazon_oauth_client_id = env.AMAZON_OAUTH_CLIENT_ID || '';
  config.extra.amazon_oauth_redirect_uri = env.AMAZON_OAUTH_REDIRECT_URI || 'com.awsaudit.awsight:/oauth2callback';
  config.extra.amazon_oauth_scopes = env.AMAZON_OAUTH_SCOPES || 'profile profile:user_id';

  return config;
};
