import { App, StackProps, Tags } from 'aws-cdk-lib';
import { EchoaiSharedStack } from '../lib/echoai-shared-stack.js';
import { EchoaiApiStack } from '../lib/echoai-api-stack.js';
import { EchoaiOpsStack } from '../lib/echoai-ops-stack.js';

const app = new App();

const stage = process.env.STAGE || process.env.APP_STAGE || 'develop';
const region = process.env.CDK_DEFAULT_REGION || 'ap-northeast-2';
const account = process.env.CDK_DEFAULT_ACCOUNT || '000000000000';

const common: StackProps = { env: { account, region } };

const shared = new EchoaiSharedStack(app, `EchoAI-Shared-${stage}`, {
  ...common,
  stage,
});

const api = new EchoaiApiStack(app, `EchoAI-Api-${stage}`, {
  ...common,
  stage,
  documentsBucketName: shared.documentsBucketName,
});

const ops = new EchoaiOpsStack(app, `EchoAI-Ops-${stage}`, {
  ...common,
  stage,
});

Tags.of(app).add('app', 'echoai');
Tags.of(app).add('stage', stage);

