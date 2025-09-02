import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

const isDevelopment = process.env.NODE_ENV === 'development';

const s3Config: S3ClientConfig = {
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
};

if (isDevelopment) {
  s3Config.endpoint = 'http://localhost:4566';
  s3Config.region = 'us-east-1';
  s3Config.credentials = {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  };
  s3Config.forcePathStyle = true;
}

export const s3Client = new S3Client(s3Config);
