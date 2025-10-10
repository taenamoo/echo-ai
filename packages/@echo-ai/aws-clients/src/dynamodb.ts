import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '@echo-ai/config';

function createDynamoDbClient() {
  const config = getConfig();
  const isLocal = config.stage === 'local';

  return new DynamoDBClient({
    region: config.awsRegion,
    endpoint: config.dynamodbEndpoint,
    credentials: isLocal
      ? {
          accessKeyId: config.awsAccessKeyId ?? 'dummy',
          secretAccessKey: config.awsSecretAccessKey ?? 'dummy',
        }
      : undefined,
  });
}

const baseClient = createDynamoDbClient();

export const dynamoDbDocumentClient = DynamoDBDocumentClient.from(baseClient);

const stageRaw = process.env.APP_STAGE || process.env.STAGE || 'develop';
const stageId = stageRaw.toLowerCase().replace(/[^a-z0-9-]/g, '-');
const stageSuffix = stageId.length > 0 ? stageId : 'default';
const withStage = (base: string) => `${base}-${stageSuffix}`;

const defaultMainTableName = withStage('EchoAI-Main-Table');
const defaultStudyTableName = withStage('EchoAi-Studies');

export const MAIN_TABLE_NAME =
  process.env.MAIN_TABLE_NAME && process.env.MAIN_TABLE_NAME.length > 0
    ? process.env.MAIN_TABLE_NAME
    : defaultMainTableName;

export const STUDY_TABLE_NAME =
  process.env.STUDY_TABLE_NAME && process.env.STUDY_TABLE_NAME.length > 0
    ? process.env.STUDY_TABLE_NAME
    : defaultStudyTableName;
