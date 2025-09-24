import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { getConfig } from '@echo-ai/config';

function createS3Config(): S3ClientConfig {
  const config = getConfig();
  const base: S3ClientConfig = {
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId ?? 'dummy',
      secretAccessKey: config.awsSecretAccessKey ?? 'dummy',
    },
  };

  if (config.stage === 'local' && config.s3Endpoint) {
    return {
      ...base,
      endpoint: config.s3Endpoint,
      forcePathStyle: true,
    } satisfies S3ClientConfig;
  }

  if (config.stage === 'local') {
    return {
      ...base,
      endpoint: 'http://localstack:4566',
      forcePathStyle: true,
    } satisfies S3ClientConfig;
  }

  return {
    region: config.awsRegion,
  } satisfies S3ClientConfig;
}

export const s3Client = new S3Client(createS3Config());
