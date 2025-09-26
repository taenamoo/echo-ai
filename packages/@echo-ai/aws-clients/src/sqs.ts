import { SQSClient } from '@aws-sdk/client-sqs';
import { getConfig } from '@echo-ai/config';

function createSqsClient(): SQSClient {
  const config = getConfig();
  const isLocal = config.stage === 'local';

  return new SQSClient({
    region: config.awsRegion,
    endpoint: isLocal ? config.sqsEndpoint : undefined,
    credentials: isLocal
      ? {
          accessKeyId: config.awsAccessKeyId ?? 'dummy',
          secretAccessKey: config.awsSecretAccessKey ?? 'dummy',
        }
      : undefined,
  });
}

export const sqsClient = createSqsClient();
