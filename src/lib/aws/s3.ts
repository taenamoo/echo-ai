import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { config } from '@/lib/config';

const isDevelopment = config.nodeEnv === 'development';

const s3Config: S3ClientConfig = {
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId || 'dummy',
    secretAccessKey: config.awsSecretAccessKey || 'dummy',
  },
};

if (isDevelopment) {
  // Prefer explicit endpoint if provided (e.g., set in docker-compose for container networking)
  s3Config.endpoint = config.s3Endpoint || 'http://localstack:4566';
  s3Config.region = config.awsRegion;
  s3Config.forcePathStyle = true;
}

export const s3Client = new S3Client(s3Config);
