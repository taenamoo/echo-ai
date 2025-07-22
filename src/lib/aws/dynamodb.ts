import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const isDev = process.env.NODE_ENV === 'development';
const endpoint = isDev ? 'http://dynamodb-local:8000' : undefined;

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    endpoint: endpoint,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
    }
});

const docClient = DynamoDBDocumentClient.from(client);

export const DYNAMODB_TABLE_NAME = 'EchoAI-Main-Table';
export default docClient;