import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { getConfig } from '@echo-ai/config';

function createSecretsManagerClient() {
  const cfg = getConfig();
  return new SecretsManagerClient({
    region: cfg.awsRegion,
    // credentials: use default provider chain in AWS; local dev inherits from env
  });
}

export const secretsManagerClient = createSecretsManagerClient();

export async function getSecretJson<T = any>(secretIdOrArn: string): Promise<T | null> {
  try {
    const res = await secretsManagerClient.send(new GetSecretValueCommand({ SecretId: secretIdOrArn }));
    const raw = res.SecretString || (res.SecretBinary ? Buffer.from(res.SecretBinary as any).toString('utf8') : null);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

