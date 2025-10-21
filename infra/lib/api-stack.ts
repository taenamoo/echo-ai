import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

export interface EchoAiApiStackProps extends cdk.StackProps {
  uiBucket: string;
  uiCloudFrontDomain?: string;
}

export class EchoAiApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EchoAiApiStackProps) {
    super(scope, id, props);

    const moduleDir = fileURLToPath(new URL('.', import.meta.url));
    const infraDir = moduleDir.includes('/dist/')
      ? fileURLToPath(new URL('../../', import.meta.url))
      : fileURLToPath(new URL('..', import.meta.url));
    const projectRoot = resolve(infraDir, '..');
    const lambdaDir = join(projectRoot, 'services', 'api', 'src', 'lambda');
    const lambdaEntry = (filename: string) => join(lambdaDir, filename);
    const tsconfigPath = join(projectRoot, 'tsconfig.base.json');

    const stage = process.env.APP_STAGE || process.env.STAGE || 'develop';
    const stageId = stage.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const stageSuffix = stageId.length > 0 ? stageId : 'default';
    const withStage = (base: string) => `${base}-${stageSuffix}`;

    // CORS origins: prefer env ALLOWED_ORIGINS, else include CF domain and localhost
    const allowedOriginsStr = process.env.ALLOWED_ORIGINS || '';
    const defaultOrigins = ['http://localhost:5173'];
    if (props.uiCloudFrontDomain)
      defaultOrigins.push(`https://${props.uiCloudFrontDomain}`);
    const allowOrigins = (
      allowedOriginsStr
        ? allowedOriginsStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : defaultOrigins
    ) as string[];

    // DynamoDB
    const accountsTable = new dynamodb.Table(this, 'AccountsTable', {
      tableName: withStage('EchoAI-Accounts'),
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    accountsTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const documentsTable = new dynamodb.Table(this, 'DocumentsTable', {
      tableName: withStage('EchoAI-Documents'),
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    documentsTable.addGlobalSecondaryIndex({
      indexName: 'TagsIndex',
      partitionKey: { name: 'tagKey', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const documentContentTable = new dynamodb.Table(
      this,
      'DocumentContentTable',
      {
        tableName: withStage('EchoAI-DocumentContent'),
        partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const studyTable = new dynamodb.Table(this, 'StudyTable', {
      tableName: withStage('EchoAi-Studies'),
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

    // Allow browser presigned uploads from allowed origins
    documentsBucket.addCorsRule({
      allowedOrigins: allowOrigins,
      allowedMethods: [
        s3.HttpMethods.POST,
        s3.HttpMethods.PUT,
        s3.HttpMethods.GET,
      ],
      allowedHeaders: ['*'],
      exposedHeaders: ['ETag'],
      maxAge: 3600,
    });

    // SQS queue for summarization
    const summarizeQueue = new sqs.Queue(this, 'SummarizeQueue', {
      queueName: withStage('echoai-summarize-queue'),
      visibilityTimeout: cdk.Duration.seconds(60),
    });

    // Secrets Manager (runtime source for JWT/Gemini and related secrets)
    const secret = new secretsmanager.Secret(this, 'AppSecret', {
      secretName: `echoai/${stage}/app`,
      description: 'Echo AI app runtime secrets (JWT, Gemini, etc.)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          JWT_SECRET: 'development-secret',
          GEMINI_API_KEY: 'development-gemini-key',
          SUMMARIZE_PROVIDER: 'gemini',
        }),
        generateStringKey: 'placeholder',
      },
    });

    // Lambda bundling options
    const nodejsFnDefaults: Partial<nodejs.NodejsFunctionProps> = {
      projectRoot,
      depsLockFilePath: join(projectRoot, 'pnpm-lock.yaml'),
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(20),
      bundling: {
        minify: true,
        externalModules: [],
        tsconfig: tsconfigPath,
      },
      environment: {
        APP_STAGE: stage,
        ALLOWED_ORIGINS: allowOrigins.join(','),
        CORS_ALLOW_HEADERS: 'authorization,content-type',
        CORS_ALLOW_METHODS: 'GET,POST,PUT,DELETE,OPTIONS',
        ACCOUNTS_TABLE_NAME: accountsTable.tableName,
        DOCUMENTS_TABLE_NAME: documentsTable.tableName,
        DOCUMENT_CONTENT_TABLE_NAME: documentContentTable.tableName,
        STUDY_TABLE_NAME: studyTable.tableName,
        S3_BUCKET_NAME: documentsBucket.bucketName,
        SUMMARIZE_SQS_QUEUE_URL: summarizeQueue.queueUrl,
        JWT_SECRET: secret.secretValueFromJson('JWT_SECRET').unsafeUnwrap(),
        GEMINI_API_KEY: secret
          .secretValueFromJson('GEMINI_API_KEY')
          .unsafeUnwrap(),
        SUMMARIZE_USE_MOCK: stage === 'local' ? 'true' : 'false',
        SECRETS_NAME: secret.secretName,
        SECRETS_ARN: secret.secretArn,
      },
    };

    // API Lambdas
    const auth = {
      signup: new nodejs.NodejsFunction(this, 'AuthSignupFn', {
        entry: lambdaEntry('auth.ts'),
        handler: 'signup',
        ...nodejsFnDefaults,
      }),
      login: new nodejs.NodejsFunction(this, 'AuthLoginFn', {
        entry: lambdaEntry('auth.ts'),
        handler: 'login',
        ...nodejsFnDefaults,
      }),
      me: new nodejs.NodejsFunction(this, 'AuthMeFn', {
        entry: lambdaEntry('auth.ts'),
        handler: 'me',
        ...nodejsFnDefaults,
      }),
    };

    const presign = new nodejs.NodejsFunction(this, 'PresignCreateFn', {
      entry: lambdaEntry('presign.ts'),
      handler: 'createPresign',
      ...nodejsFnDefaults,
    });

    const documents = {
      create: new nodejs.NodejsFunction(this, 'DocumentsCreateFn', {
        entry: lambdaEntry('documents.ts'),
        handler: 'create',
        ...nodejsFnDefaults,
      }),
      list: new nodejs.NodejsFunction(this, 'DocumentsListFn', {
        entry: lambdaEntry('documents.ts'),
        handler: 'list',
        ...nodejsFnDefaults,
      }),
      get: new nodejs.NodejsFunction(this, 'DocumentsGetFn', {
        entry: lambdaEntry('documents.ts'),
        handler: 'get',
        ...nodejsFnDefaults,
      }),
      remove: new nodejs.NodejsFunction(this, 'DocumentsRemoveFn', {
        entry: lambdaEntry('documents.ts'),
        handler: 'remove',
        ...nodejsFnDefaults,
      }),
      summarize: new nodejs.NodejsFunction(this, 'DocumentsSummarizeFn', {
        entry: lambdaEntry('documents.ts'),
        handler: 'summarize',
        ...nodejsFnDefaults,
      }),
    };

    const study = {
      list: new nodejs.NodejsFunction(this, 'StudyListFn', {
        entry: lambdaEntry('study.ts'),
        handler: 'list',
        ...nodejsFnDefaults,
      }),
      create: new nodejs.NodejsFunction(this, 'StudyCreateFn', {
        entry: lambdaEntry('study.ts'),
        handler: 'create',
        ...nodejsFnDefaults,
      }),
      update: new nodejs.NodejsFunction(this, 'StudyUpdateFn', {
        entry: lambdaEntry('study.ts'),
        handler: 'update',
        ...nodejsFnDefaults,
      }),
      remove: new nodejs.NodejsFunction(this, 'StudyRemoveFn', {
        entry: lambdaEntry('study.ts'),
        handler: 'remove',
        ...nodejsFnDefaults,
      }),
      quiz: new nodejs.NodejsFunction(this, 'StudyQuizFn', {
        entry: lambdaEntry('study.ts'),
        handler: 'quiz',
        ...nodejsFnDefaults,
      }),
      search: new nodejs.NodejsFunction(this, 'StudySearchFn', {
        entry: lambdaEntry('study.ts'),
        handler: 'search',
        ...nodejsFnDefaults,
      }),
      analyze: new nodejs.NodejsFunction(this, 'StudyAnalyzeFn', {
        entry: lambdaEntry('study.ts'),
        handler: 'analyze',
        ...nodejsFnDefaults,
      }),
    };

    const chatHr = {
      chat: new nodejs.NodejsFunction(this, 'ChatHrFn', {
        entry: lambdaEntry('chatHr.ts'),
        handler: 'chat',
        ...nodejsFnDefaults,
      }),
    };

    const hrDocuments = {
      list: new nodejs.NodejsFunction(this, 'HrDocumentsListFn', {
        entry: lambdaEntry('hrDocuments.ts'),
        handler: 'list',
        ...nodejsFnDefaults,
      }),
    };

    // S3 permissions
    documentsBucket.grantReadWrite(documents.create);
    documentsBucket.grantReadWrite(documents.get);
    documentsBucket.grantReadWrite(documents.remove);
    documentsBucket.grantRead(documents.summarize);
    documentsBucket.grantReadWrite(presign);
    documentsBucket.grantRead(chatHr.chat);

    // DynamoDB permissions
    [auth.signup, auth.login, auth.me].forEach((fn) => {
      accountsTable.grantReadWriteData(fn);
    });

    [
      documents.create,
      documents.list,
      documents.get,
      documents.remove,
      documents.summarize,
      hrDocuments.list,
      chatHr.chat,
    ].forEach((fn) => {
      documentsTable.grantReadWriteData(fn);
    });

    [
      documents.create,
      documents.get,
      documents.remove,
      documents.summarize,
      chatHr.chat,
    ].forEach((fn) => {
      documentContentTable.grantReadWriteData(fn);
    });

    [
      study.list,
      study.create,
      study.update,
      study.remove,
      study.quiz,
      study.search,
      study.analyze,
    ].forEach((fn) => {
      studyTable.grantReadWriteData(fn);
    });

    // API Gateway (REST)
    const api = new apigw.RestApi(this, 'EchoApi', {
      restApiName: `echoai-${stage}`,
      defaultCorsPreflightOptions: {
        allowOrigins,
        allowHeaders: ['authorization', 'content-type'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      },
      deployOptions: { stageName: stage },
    });

    // Routes
    const authRes = api.root.addResource('auth');
    authRes
      .addResource('signup')
      .addMethod('POST', new apigw.LambdaIntegration(auth.signup));
    authRes
      .addResource('login')
      .addMethod('POST', new apigw.LambdaIntegration(auth.login));
    api.root
      .addResource('me')
      .addMethod('GET', new apigw.LambdaIntegration(auth.me));

    const documentsRes = api.root.addResource('documents');
    documentsRes.addMethod('GET', new apigw.LambdaIntegration(documents.list));
    documentsRes.addMethod(
      'POST',
      new apigw.LambdaIntegration(documents.create)
    );
    documentsRes
      .addResource('presign')
      .addMethod('POST', new apigw.LambdaIntegration(presign));
    const docId = documentsRes.addResource('{id}');
    docId.addMethod('GET', new apigw.LambdaIntegration(documents.get));
    docId.addMethod('DELETE', new apigw.LambdaIntegration(documents.remove));
    docId
      .addResource('summarize')
      .addMethod('POST', new apigw.LambdaIntegration(documents.summarize));

    const studyRes = api.root.addResource('study');
    studyRes.addMethod('GET', new apigw.LambdaIntegration(study.list));
    studyRes.addMethod('POST', new apigw.LambdaIntegration(study.create));
    const studyId = studyRes.addResource('{id}');
    studyId.addMethod('PUT', new apigw.LambdaIntegration(study.update));
    studyId.addMethod('DELETE', new apigw.LambdaIntegration(study.remove));
    studyRes
      .addResource('quiz')
      .addMethod('POST', new apigw.LambdaIntegration(study.quiz));
    studyRes
      .addResource('search')
      .addMethod('POST', new apigw.LambdaIntegration(study.search));
    studyRes
      .addResource('analyze')
      .addMethod('POST', new apigw.LambdaIntegration(study.analyze));

    const chatHrRes = api.root.addResource('chatHr');
    chatHrRes.addMethod('POST', new apigw.LambdaIntegration(chatHr.chat));

    const hrDocumentsRes = api.root.addResource('hr-documents');
    hrDocumentsRes.addMethod('GET', new apigw.LambdaIntegration(hrDocuments.list));

    // AI Processor (SQS consumer)
    const aiProcessor = new nodejs.NodejsFunction(this, 'AiProcessorFn', {
      ...nodejsFnDefaults,
      entry: join(projectRoot, 'services', 'ai-processor', 'src', 'handler.ts'),
      handler: 'handler',
      memorySize: 768,
      timeout: cdk.Duration.seconds(60),
      bundling: {
        ...nodejsFnDefaults.bundling,
        minify: true,
        tsconfig: tsconfigPath,
      },
      environment: {
        ...nodejsFnDefaults.environment,
        JWT_SECRET: secret.secretValueFromJson('JWT_SECRET').unsafeUnwrap(),
        GEMINI_API_KEY: secret
          .secretValueFromJson('GEMINI_API_KEY')
          .unsafeUnwrap(),
      },
    });
    aiProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(summarizeQueue, { batchSize: 5 })
    );

    documentsBucket.grantReadWrite(aiProcessor);
    documentsTable.grantReadWriteData(aiProcessor);
    documentContentTable.grantReadWriteData(aiProcessor);
    summarizeQueue.grantSendMessages(documents.summarize);

    // Outputs
    // allow Lambdas to read secret (runtime integration to be implemented in step 6)
    secret.grantRead(auth.signup);
    secret.grantRead(auth.login);
    secret.grantRead(auth.me);
    secret.grantRead(presign);
    Object.values(documents).forEach((fn) => secret.grantRead(fn));
    Object.values(study).forEach((fn) => secret.grantRead(fn));
    secret.grantRead(chatHr.chat);
    secret.grantRead(hrDocuments.list);
    secret.grantRead(aiProcessor);

    const apiUrl = api.url.endsWith('/') ? api.url.slice(0, -1) : api.url;
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: apiUrl });
    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: documentsBucket.bucketName,
    });
    new cdk.CfnOutput(this, 'SummarizeQueueUrl', {
      value: summarizeQueue.queueUrl,
    });
    new cdk.CfnOutput(this, 'SecretsArn', { value: secret.secretArn });

    // -------- CloudWatch basic alarms (dev) --------
    const sqsAgeMetric = summarizeQueue.metricApproximateAgeOfOldestMessage({
      period: cdk.Duration.minutes(5),
      statistic: 'Maximum',
    });
    const sqsAgeAlarm = new cw.Alarm(this, 'SummarizeQueueAgeAlarm', {
      metric: sqsAgeMetric,
      threshold: 60, // seconds
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'SQS summarize queue oldest message age > 60s',
    });

    const aiErrorsMetric = aiProcessor.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });
    const aiErrorsAlarm = new cw.Alarm(this, 'AiProcessorErrorsAlarm', {
      metric: aiErrorsMetric,
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator:
        cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: 'AI Processor Lambda errors detected',
    });

    const api5xxMetric = api.metricServerError({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });
    const api5xxAlarm = new cw.Alarm(this, 'Api5xxAlarm', {
      metric: api5xxMetric,
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator:
        cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: 'API Gateway 5xx errors detected',
    });

    new cdk.CfnOutput(this, 'AlarmNames', {
      value: [
        sqsAgeAlarm.alarmName,
        aiErrorsAlarm.alarmName,
        api5xxAlarm.alarmName,
      ].join(','),
    });
  }
}
