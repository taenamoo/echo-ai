import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from '@/lib/config';

// .env.local 파일의 DYNAMODB_ENDPOINT 값을 사용하도록 변경
const endpoint = config.dynamodbEndpoint;

// log endpoint for debugging
console.log('DynamoDB Endpoint:', endpoint);

const client = new DynamoDBClient({
  region: config.awsRegion,
  endpoint: endpoint,
  credentials: {
    accessKeyId: config.awsAccessKeyId || 'dummy',
    secretAccessKey: config.awsSecretAccessKey || 'dummy',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// [수정] 각 기능에 맞는 테이블 이름을 별도로 내보냅니다.
export const MAIN_TABLE_NAME = 'EchoAI-Main-Table'; // AI 문서 요약 및 인증용
export const STUDY_TABLE_NAME = 'EchoAi-Studies';   // 스터디 노트용

export default docClient;
