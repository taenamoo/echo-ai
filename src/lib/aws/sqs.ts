import { SQSClient } from '@aws-sdk/client-sqs';

const isDev = process.env.NODE_ENV === 'development';

export const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  endpoint: isDev ? (process.env.SQS_ENDPOINT || undefined) : undefined,
  // In development allow dummy creds (LocalStack); in production rely on default provider chain
  credentials: isDev
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
      }
    : undefined,
});
