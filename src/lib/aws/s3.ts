import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

const isDevelopment = process.env.NODE_ENV === 'development';

const s3Config: S3ClientConfig = {
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
};

if (isDevelopment) {
  // Prefer explicit endpoint if provided (e.g., set in docker-compose for container networking)
  s3Config.endpoint = process.env.S3_ENDPOINT || 'http://localstack:4566';
  s3Config.region = process.env.AWS_REGION || 'ap-northeast-2';
  s3Config.forcePathStyle = true;
}

export const s3Client = new S3Client(s3Config);
