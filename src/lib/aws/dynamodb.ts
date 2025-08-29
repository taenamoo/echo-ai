import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// .env.local 파일의 DYNAMODB_ENDPOINT 값을 사용하도록 변경
const endpoint = process.env.DYNAMODB_ENDPOINT;

// log endpoint for debugging
console.log('DynamoDB Endpoint:', endpoint);

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  endpoint: endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// [수정] 각 기능에 맞는 테이블 이름을 별도로 내보냅니다.
export const MAIN_TABLE_NAME = 'EchoAI-Main-Table'; // AI 문서 요약 및 인증용
export const STUDY_TABLE_NAME = 'EchoAi-Studies';   // 스터디 노트용

export default docClient;
