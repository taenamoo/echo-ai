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

const defaultAccountsTableName = withStage('EchoAI-Accounts');
const defaultDocumentsTableName = withStage('EchoAI-Documents');
const defaultDocumentContentTableName = withStage('EchoAI-DocumentContent');
const defaultStudyTableName = withStage('EchoAi-Studies');

export const ACCOUNTS_TABLE_NAME =
  process.env.ACCOUNTS_TABLE_NAME && process.env.ACCOUNTS_TABLE_NAME.length > 0
    ? process.env.ACCOUNTS_TABLE_NAME
    : defaultAccountsTableName;

export const DOCUMENTS_TABLE_NAME =
  process.env.DOCUMENTS_TABLE_NAME && process.env.DOCUMENTS_TABLE_NAME.length > 0
    ? process.env.DOCUMENTS_TABLE_NAME
    : defaultDocumentsTableName;

export const DOCUMENT_CONTENT_TABLE_NAME =
  process.env.DOCUMENT_CONTENT_TABLE_NAME &&
  process.env.DOCUMENT_CONTENT_TABLE_NAME.length > 0
    ? process.env.DOCUMENT_CONTENT_TABLE_NAME
    : defaultDocumentContentTableName;

export const STUDY_TABLE_NAME =
  process.env.STUDY_TABLE_NAME && process.env.STUDY_TABLE_NAME.length > 0
    ? process.env.STUDY_TABLE_NAME
    : defaultStudyTableName;
