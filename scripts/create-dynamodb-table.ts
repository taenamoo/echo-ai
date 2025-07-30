import { DYNAMODB_TABLE_NAME } from '@/lib/aws/dynamodb';
import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb';

// Local DynamoDB endpoint for development
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const TABLE_NAME = DYNAMODB_TABLE_NAME;

/**
 * Checks if the DynamoDB table exists
 * @param tableName The name of the DynamoDB table to create.
 * @returns
 */
const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const response = await dynamoDBClient.send(new ListTablesCommand({}));
    return response.TableNames?.includes(tableName) || false;
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
};

/**
 * Create a Main DynamoDB table
 */
const createMainTable = async () => {
  const command = new CreateTableCommand({
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // Partition key
      { AttributeName: 'SK', KeyType: 'RANGE' }, // Sort key
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' }, // String type
      { AttributeName: 'SK', AttributeType: 'S' }, // String type
      { AttributeName: 'email', AttributeType: 'S' }, // String type
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' }, // Partition key
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  });

  try {
    const response = await dynamoDBClient.send(command);
    console.log('Table created successfully:', response);
  } catch (error) {
    console.error('Error creating table:', error);
  }
};

/**
 * TO DO: Create Initial data in DynamoDB table
 */
const sendInitialData = async () => {
  // Implement logic to send initial data to the DynamoDB table
  console.log('Sending initial data to the table...');
};

/**
 * Main migration function
 */
const runMigration = async () => {
  console.log('Starting migration to create DynamoDB table...');

  const exists = await tableExists(TABLE_NAME);
  if (exists) {
    console.log(`Table ${TABLE_NAME} already exists.`);
    return;
  }

  try {
    console.log(`Creating table: ${TABLE_NAME}`);
    await createMainTable();

    console.log('Sending initial data to the table...');
    await sendInitialData();
  } catch (error) {
    console.error('Error during migration:', error);
    return;
  }

  console.log('Migration completed successfully.');
};

runMigration()
  .then(() => console.log('Migration script finished.'))
  .catch((error) => {
    console.error('Error in migration script:', error);
    process.exit(1);
  });
