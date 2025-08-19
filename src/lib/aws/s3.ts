import { S3Client } from '@aws-sdk/client-s3';

// TODO: AWS 자격 증명 및 리전 정보는 .env 파일 같은 환경 변수로 설정해야 합니다.
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-2'; // 예: 서울 리전
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'your-aws-access-key-id';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret-access-key';

// S3 클라이언트를 생성합니다.
// 이 설정으로 AWS 계정 및 리전에 연결할 수 있습니다.
export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});
