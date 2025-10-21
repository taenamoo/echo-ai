import 'dotenv/config';
import { resolve } from 'path';
import {
  CreateTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  type GlobalSecondaryIndex,
} from '@aws-sdk/client-dynamodb';

require('dotenv').config({ path: resolve(process.cwd(), '.env.local') });

const stageRaw = process.env.APP_STAGE || process.env.STAGE || 'develop';
const stageId = stageRaw.toLowerCase().replace(/[^a-z0-9-]/g, '-');
const stageSuffix = stageId.length > 0 ? stageId : 'default';
const withStage = (base: string) => `${base}-${stageSuffix}`;

const ACCOUNTS_TABLE_NAME =
  process.env.ACCOUNTS_TABLE_NAME || withStage('EchoAI-Accounts');
const DOCUMENTS_TABLE_NAME =
  process.env.DOCUMENTS_TABLE_NAME || withStage('EchoAI-Documents');
const DOCUMENT_CONTENT_TABLE_NAME =
  process.env.DOCUMENT_CONTENT_TABLE_NAME ||
  withStage('EchoAI-DocumentContent');
const STUDY_TABLE_NAME =
  process.env.STUDY_TABLE_NAME || withStage('EchoAi-Studies');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

async function createTableIfNotExists(
  tableName: string,
  keySchema: any[],
  attributeDefinitions: any[],
  gsis: GlobalSecondaryIndex[] = [],
) {
  if (!tableName) {
    console.error(
      'Error: Table name is undefined. Skipping table creation for schema:',
      keySchema,
    );
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

  await createTableIfNotExists(
    ACCOUNTS_TABLE_NAME,
    [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      },
    ],
  );

  await createTableIfNotExists(
    DOCUMENTS_TABLE_NAME,
    [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'tagKey', AttributeType: 'S' },
    ],
    [
      {
        IndexName: 'TagsIndex',
        KeySchema: [{ AttributeName: 'tagKey', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      },
    ],
  );

  await createTableIfNotExists(
    DOCUMENT_CONTENT_TABLE_NAME,
    [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
  );

  await createTableIfNotExists(
    STUDY_TABLE_NAME,
    [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'study_id', KeyType: 'RANGE' },
    ],
    [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'study_id', AttributeType: 'S' },
    ],
  );

  console.log('DynamoDB migration finished.');
}

main().catch((err) => {
  console.error('Migration script failed.', err);
  process.exit(1);
});
