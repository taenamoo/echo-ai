import { SQSClient } from '@aws-sdk/client-sqs';
import { config } from '@/lib/config';

const isDev = config.nodeEnv === 'development';

export const sqsClient = new SQSClient({
  region: config.awsRegion,
  endpoint: isDev ? config.sqsEndpoint : undefined,
  // In development allow dummy creds (LocalStack); in production rely on default provider chain
  credentials: isDev
    ? {
        accessKeyId: config.awsAccessKeyId || 'dummy',
        secretAccessKey: config.awsSecretAccessKey || 'dummy',
      }
    : undefined,
});
