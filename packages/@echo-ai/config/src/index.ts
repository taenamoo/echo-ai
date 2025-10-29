export type Stage = 'local' | 'develop' | 'production';

export type AppConfig = {
  stage: Stage;
  nodeEnv?: string;
  jwtSecret: string;
  geminiApiKey: string;
  s3BucketName: string;
  awsRegion: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  s3PublicEndpoint?: string;
  s3Endpoint?: string;
  sqsEndpoint?: string;
  dynamodbEndpoint?: string;
  summarizeSqsQueueUrl?: string;
  hashSalt?: string;
};

let cachedConfig: AppConfig | null = null;
let hydrated = false;

/**
 * Hydrate process.env from Secrets Manager once (best-effort).
 * Looks for `SECRETS_ARN` or `SECRETS_NAME` and attempts to fetch JSON secret.
 * Populates known keys if they are not already set in env.
 */
export async function hydrateConfigFromSecrets(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (hydrated) return;
  const secretId = env.SECRETS_ARN || env.SECRETS_NAME;
  if (!secretId) { hydrated = true; return; }
  try {
    const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region: env.AWS_REGION || env.AWS_DEFAULT_REGION || 'ap-northeast-2' });
    const res = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    const raw = res.SecretString || (res.SecretBinary ? Buffer.from(res.SecretBinary as any).toString('utf8') : null);
    if (raw) {
      const json = JSON.parse(raw);
      const keys = ['JWT_SECRET', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'HASH_SALT', 'SUMMARIZE_PROVIDER'] as const;
      for (const k of keys) {
        if (json[k]) {
          env[k] = String(json[k]);
        }
      }
    }
  } catch {
    // ignore secret fetch errors in dev; fallback to env
  } finally {
    hydrated = true;
    // reset cached config to allow rebuild with secret values
    cachedConfig = null;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const stage = resolveStage(env);
  const cfg: AppConfig = {
    stage,
    nodeEnv: env.NODE_ENV,
    jwtSecret: required(env, 'JWT_SECRET'),
    geminiApiKey: required(env, 'GEMINI_API_KEY'),
    s3BucketName: required(env, 'S3_BUCKET_NAME'),
    awsRegion: env.AWS_REGION ?? 'ap-northeast-2',
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    s3PublicEndpoint: env.S3_PUBLIC_ENDPOINT,
    s3Endpoint: env.S3_ENDPOINT,
    sqsEndpoint: env.SQS_ENDPOINT,
    dynamodbEndpoint: env.DYNAMODB_ENDPOINT,
    summarizeSqsQueueUrl: env.SUMMARIZE_SQS_QUEUE_URL,
    hashSalt: env.HASH_SALT,
  };

  cachedConfig = cfg;
  return cfg;
}

export function getConfig(): AppConfig {
  return loadConfig();
}

function resolveStage(env: NodeJS.ProcessEnv): Stage {
  const explicit = env.APP_STAGE ?? env.STAGE;
  if (explicit && isStage(explicit)) {
    return explicit;
  }
  const nodeEnv = env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'development' || nodeEnv === 'test') return 'local';
  return 'develop';
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function isStage(value: string): value is Stage {
  return value === 'local' || value === 'develop' || value === 'production';
}
