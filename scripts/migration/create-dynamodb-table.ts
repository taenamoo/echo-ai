// [추가] dotenv를 사용하여 .env.local 파일의 환경 변수를 불러옵니다.
import 'dotenv/config';
import { resolve } from 'path';

require('dotenv').config({ path: resolve(process.cwd(), '.env.local') });


import { CreateTableCommand, DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

// [수정] 스크립트 내에서 테이블 이름을 직접 정의하여 의존성을 제거합니다.
const MAIN_TABLE_NAME = 'EchoAI-Main-Table';
const STUDY_TABLE_NAME = 'EchoAi-Studies';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

async function createTableIfNotExists(tableName: string, keySchema: any[], attributeDefinitions: any[], gsis: any[] = []) {
  // tableName이 유효한지 확인합니다.
  if (!tableName) {
    console.error("Error: Table name is undefined. Skipping table creation.");
    return;
  }
  try {
    const { TableNames } = await client.send(new ListTablesCommand({}));
    if (TableNames && TableNames.includes(tableName)) {
      console.log(`Table "${tableName}" already exists.`);
      return;
    }

    console.log(`Creating table: ${tableName}`);
    const command = new CreateTableCommand({
      TableName: tableName,
      KeySchema: keySchema,
      AttributeDefinitions: attributeDefinitions,
      GlobalSecondaryIndexes: gsis.length > 0 ? gsis : undefined,
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    });
    await client.send(command);
    console.log(`Table "${tableName}" created successfully.`);
  } catch (err) {
    console.error(`Error creating table "${tableName}":`, err);
  }
}

async function main() {
  console.log('Starting migration to create DynamoDB tables...');

  // 1. EchoAI-Main-Table 생성
  await createTableIfNotExists(
    MAIN_TABLE_NAME,
    [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'tags', AttributeType: 'S' },
    ],
    [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      },
      {
        IndexName: 'TagsIndex',
        KeySchema: [{ AttributeName: 'tags', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      },
    ]
  );

  // 2. EchoAi-Studies 테이블 생성
  await createTableIfNotExists(
    STUDY_TABLE_NAME,
    [
        { AttributeName: 'user_id', KeyType: 'HASH' },
        { AttributeName: 'study_id', KeyType: 'RANGE' },
    ],
    [
        { AttributeName: 'user_id', AttributeType: 'S' },
        { AttributeName: 'study_id', AttributeType: 'S' },
    ]
  );

  console.log('DynamoDB migration finished.');
}

main();
