import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface EchoaiApiProps extends StackProps {
  stage: string;
  documentsBucketName: string;
}

export class EchoaiApiStack extends Stack {
  constructor(scope: Construct, id: string, props: EchoaiApiProps) {
    super(scope, id, props);

    const removal = props.stage === 'production' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    // DynamoDB main table
    const table = new Table(this, 'MainTable', {
      tableName: props.stage === 'production' ? undefined : 'EchoAI-Main-Table',
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: removal,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // SQS Queue for summarization with DLQ
    const dlq = new Queue(this, 'SummarizeDlq', {
      retentionPeriod: Duration.days(14),
    });
    const queue = new Queue(this, 'SummarizeQueue', {
      deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
      visibilityTimeout: Duration.seconds(60),
    });

    new CfnOutput(this, 'TableName', { value: table.tableName });
    new CfnOutput(this, 'SummarizeQueueUrl', { value: queue.queueUrl });
  }
}

