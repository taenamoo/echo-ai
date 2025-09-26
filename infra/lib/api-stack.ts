import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from '@aws-cdk/aws-lambda-nodejs-alpha';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface EchoAiApiStackProps extends cdk.StackProps {
  uiBucket: string;
}

export class EchoAiApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EchoAiApiStackProps) {
    super(scope, id, props);

    const stage = process.env.APP_STAGE || process.env.STAGE || 'develop';

    // DynamoDB
    const mainTable = new dynamodb.Table(this, 'MainTable', {
      tableName: 'EchoAI-Main-Table',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    mainTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const studyTable = new dynamodb.Table(this, 'StudyTable', {
      tableName: 'EchoAi-Studies',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'study_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 documents bucket
    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // SQS queue for summarization
    const summarizeQueue = new sqs.Queue(this, 'SummarizeQueue', {
      queueName: 'echoai-summarize-queue',
      visibilityTimeout: cdk.Duration.seconds(60),
    });

    // Lambda bundling options
    const nodejsFnDefaults: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(20),
      bundling: { minify: true, externalModules: [] },
      environment: {
        APP_STAGE: stage,
        AWS_REGION: this.region,
        S3_BUCKET_NAME: documentsBucket.bucketName,
        SUMMARIZE_SQS_QUEUE_URL: summarizeQueue.queueUrl,
      },
    };

    // API Lambdas
    const auth = {
      signup: new nodejs.NodejsFunction(this, 'AuthSignupFn', {
        entry: 'services/api/src/lambda/auth.ts',
        handler: 'signup',
        ...nodejsFnDefaults,
      }),
      login: new nodejs.NodejsFunction(this, 'AuthLoginFn', {
        entry: 'services/api/src/lambda/auth.ts',
        handler: 'login',
        ...nodejsFnDefaults,
      }),
      me: new nodejs.NodejsFunction(this, 'AuthMeFn', {
        entry: 'services/api/src/lambda/auth.ts',
        handler: 'me',
        ...nodejsFnDefaults,
      }),
    };

    const presign = new nodejs.NodejsFunction(this, 'PresignCreateFn', {
      entry: 'services/api/src/lambda/presign.ts',
      handler: 'createPresign',
      ...nodejsFnDefaults,
    });

    const documents = {
      create: new nodejs.NodejsFunction(this, 'DocumentsCreateFn', {
        entry: 'services/api/src/lambda/documents.ts',
        handler: 'create',
        ...nodejsFnDefaults,
      }),
      list: new nodejs.NodejsFunction(this, 'DocumentsListFn', {
        entry: 'services/api/src/lambda/documents.ts',
        handler: 'list',
        ...nodejsFnDefaults,
      }),
      get: new nodejs.NodejsFunction(this, 'DocumentsGetFn', {
        entry: 'services/api/src/lambda/documents.ts',
        handler: 'get',
        ...nodejsFnDefaults,
      }),
      remove: new nodejs.NodejsFunction(this, 'DocumentsRemoveFn', {
        entry: 'services/api/src/lambda/documents.ts',
        handler: 'remove',
        ...nodejsFnDefaults,
      }),
      summarize: new nodejs.NodejsFunction(this, 'DocumentsSummarizeFn', {
        entry: 'services/api/src/lambda/documents.ts',
        handler: 'summarize',
        ...nodejsFnDefaults,
      }),
    };

    const study = {
      list: new nodejs.NodejsFunction(this, 'StudyListFn', {
        entry: 'services/api/src/lambda/study.ts',
        handler: 'list',
        ...nodejsFnDefaults,
      }),
      create: new nodejs.NodejsFunction(this, 'StudyCreateFn', {
        entry: 'services/api/src/lambda/study.ts',
        handler: 'create',
        ...nodejsFnDefaults,
      }),
      update: new nodejs.NodejsFunction(this, 'StudyUpdateFn', {
        entry: 'services/api/src/lambda/study.ts',
        handler: 'update',
        ...nodejsFnDefaults,
      }),
      remove: new nodejs.NodejsFunction(this, 'StudyRemoveFn', {
        entry: 'services/api/src/lambda/study.ts',
        handler: 'remove',
        ...nodejsFnDefaults,
      }),
      quiz: new nodejs.NodejsFunction(this, 'StudyQuizFn', {
        entry: 'services/api/src/lambda/study.ts',
        handler: 'quiz',
        ...nodejsFnDefaults,
      }),
      search: new nodejs.NodejsFunction(this, 'StudySearchFn', {
        entry: 'services/api/src/lambda/study.ts',
        handler: 'search',
        ...nodejsFnDefaults,
      }),
      analyze: new nodejs.NodejsFunction(this, 'StudyAnalyzeFn', {
        entry: 'services/api/src/lambda/study.ts',
        handler: 'analyze',
        ...nodejsFnDefaults,
      }),
    };

    // S3 permissions
    documentsBucket.grantReadWrite(documents.create);
    documentsBucket.grantReadWrite(documents.get);
    documentsBucket.grantReadWrite(documents.remove);
    documentsBucket.grantRead(documents.summarize);

    // DynamoDB permissions (coarse but simple)
    [auth.signup, auth.login, auth.me,
     presign,
     documents.create, documents.list, documents.get, documents.remove, documents.summarize,
     study.list, study.create, study.update, study.remove, study.quiz, study.search, study.analyze
    ].forEach(fn => {
      mainTable.grantReadWriteData(fn);
      studyTable.grantReadWriteData(fn);
    });

    // API Gateway (REST)
    const api = new apigw.RestApi(this, 'EchoApi', {
      restApiName: `echoai-${stage}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowHeaders: ['authorization', 'content-type'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      },
      deployOptions: { stageName: stage },
    });

    // Routes
    const authRes = api.root.addResource('auth');
    authRes.addResource('signup').addMethod('POST', new apigw.LambdaIntegration(auth.signup));
    authRes.addResource('login').addMethod('POST', new apigw.LambdaIntegration(auth.login));
    api.root.addResource('me').addMethod('GET', new apigw.LambdaIntegration(auth.me));

    const documentsRes = api.root.addResource('documents');
    documentsRes.addMethod('GET', new apigw.LambdaIntegration(documents.list));
    documentsRes.addMethod('POST', new apigw.LambdaIntegration(documents.create));
    documentsRes.addResource('presign').addMethod('POST', new apigw.LambdaIntegration(presign));
    const docId = documentsRes.addResource('{id}');
    docId.addMethod('GET', new apigw.LambdaIntegration(documents.get));
    docId.addMethod('DELETE', new apigw.LambdaIntegration(documents.remove));
    docId.addResource('summarize').addMethod('POST', new apigw.LambdaIntegration(documents.summarize));

    const studyRes = api.root.addResource('study');
    studyRes.addMethod('GET', new apigw.LambdaIntegration(study.list));
    studyRes.addMethod('POST', new apigw.LambdaIntegration(study.create));
    const studyId = studyRes.addResource('{id}');
    studyId.addMethod('PUT', new apigw.LambdaIntegration(study.update));
    studyId.addMethod('DELETE', new apigw.LambdaIntegration(study.remove));
    api.root.addResource('study').addResource('quiz').addMethod('POST', new apigw.LambdaIntegration(study.quiz));
    api.root.addResource('study').addResource('search').addMethod('POST', new apigw.LambdaIntegration(study.search));
    api.root.addResource('study').addResource('analyze').addMethod('POST', new apigw.LambdaIntegration(study.analyze));

    // AI Processor (SQS consumer)
    const aiProcessor = new nodejs.NodejsFunction(this, 'AiProcessorFn', {
      entry: 'services/ai-processor/src/handler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      memorySize: 768,
      timeout: cdk.Duration.seconds(60),
      bundling: { minify: true },
      environment: {
        APP_STAGE: stage,
        AWS_REGION: this.region,
        S3_BUCKET_NAME: documentsBucket.bucketName,
      },
    });
    aiProcessor.addEventSource(new lambdaEventSources.SqsEventSource(summarizeQueue, { batchSize: 5 }));

    documentsBucket.grantRead(aiProcessor);
    mainTable.grantReadWriteData(aiProcessor);

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url });
    new cdk.CfnOutput(this, 'DocumentsBucketName', { value: documentsBucket.bucketName });
    new cdk.CfnOutput(this, 'SummarizeQueueUrl', { value: summarizeQueue.queueUrl });
  }
}

