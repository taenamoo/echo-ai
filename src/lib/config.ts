const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

export const config = {
  jwtSecret: required('JWT_SECRET'),
  geminiApiKey: required('GEMINI_API_KEY'),
  s3BucketName: required('S3_BUCKET_NAME'),
  awsRegion: process.env.AWS_REGION || 'ap-northeast-2',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3PublicEndpoint: process.env.S3_PUBLIC_ENDPOINT,
  s3Endpoint: process.env.S3_ENDPOINT,
  sqsEndpoint: process.env.SQS_ENDPOINT,
  dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT,
  summarizeSqsQueueUrl: process.env.SUMMARIZE_SQS_QUEUE_URL,
  hashSalt: process.env.HASH_SALT,
  nodeEnv: process.env.NODE_ENV,
} as const;

export type AppConfig = typeof config;
