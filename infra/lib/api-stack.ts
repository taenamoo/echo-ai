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

export interface EchoAiApiStackProps extends cdk.StackProps {
  uiBucket: string;
  uiCloudFrontDomain?: string;
}

export class EchoAiApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EchoAiApiStackProps) {
    super(scope, id, props);

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
    const mainTable = new dynamodb.Table(this, 'MainTable', {
      tableName: withStage('EchoAI-Main-Table'),
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
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(20),
      bundling: {
        minify: true,
        externalModules: [],
        tsconfig: 'tsconfig.base.json',
      },
      environment: {
        APP_STAGE: stage,
        AWS_REGION: cdk.Stack.of(this).region,
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
    [
      auth.signup,
      auth.login,
      auth.me,
      presign,
      documents.create,
      documents.list,
      documents.get,
      documents.remove,
      documents.summarize,
      study.list,
      study.create,
      study.update,
      study.remove,
      study.quiz,
      study.search,
      study.analyze,
    ].forEach((fn) => {
      mainTable.grantReadWriteData(fn);
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
    api.root
      .addResource('study')
      .addResource('quiz')
      .addMethod('POST', new apigw.LambdaIntegration(study.quiz));
    api.root
      .addResource('study')
      .addResource('search')
      .addMethod('POST', new apigw.LambdaIntegration(study.search));
    api.root
      .addResource('study')
      .addResource('analyze')
      .addMethod('POST', new apigw.LambdaIntegration(study.analyze));

    // AI Processor (SQS consumer)
    const aiProcessor = new nodejs.NodejsFunction(this, 'AiProcessorFn', {
      entry: 'services/ai-processor/src/handler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      memorySize: 768,
      timeout: cdk.Duration.seconds(60),
      bundling: { minify: true, tsconfig: 'tsconfig.base.json' },
      environment: {
        APP_STAGE: stage,
        AWS_REGION: cdk.Stack.of(this).region,
        S3_BUCKET_NAME: documentsBucket.bucketName,
        JWT_SECRET: secret.secretValueFromJson('JWT_SECRET').unsafeUnwrap(),
        GEMINI_API_KEY: secret
          .secretValueFromJson('GEMINI_API_KEY')
          .unsafeUnwrap(),
        SUMMARIZE_USE_MOCK: stage === 'local' ? 'true' : 'false',
        SECRETS_NAME: secret.secretName,
        SECRETS_ARN: secret.secretArn,
      },
    });
    aiProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(summarizeQueue, { batchSize: 5 })
    );

    documentsBucket.grantRead(aiProcessor);
    mainTable.grantReadWriteData(aiProcessor);
    summarizeQueue.grantSendMessages(documents.summarize);

    // Outputs
    // allow Lambdas to read secret (runtime integration to be implemented in step 6)
    secret.grantRead(auth.signup);
    secret.grantRead(auth.login);
    secret.grantRead(auth.me);
    secret.grantRead(presign);
    Object.values(documents).forEach((fn) => secret.grantRead(fn));
    Object.values(study).forEach((fn) => secret.grantRead(fn));
    secret.grantRead(aiProcessor);

    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url });
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
