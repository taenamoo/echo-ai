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

export const MAIN_TABLE_NAME = 'EchoAI-Main-Table';
export const STUDY_TABLE_NAME = 'EchoAi-Studies';
