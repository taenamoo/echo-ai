#!/usr/bin/env node
import 'source-map-support/register.js';
import * as cdk from 'aws-cdk-lib';
import { EchoAiSharedStack } from '../lib/shared-stack.js';
import { EchoAiApiStack } from '../lib/api-stack.js';

const app = new cdk.App();

const stage = process.env.APP_STAGE || process.env.STAGE || 'develop';
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-2',
};

const shared = new EchoAiSharedStack(app, `EchoAi-Shared-${stage}`, {
  env,
  description: 'Echo AI Shared Stack (S3/CloudFront)',
});

new EchoAiApiStack(app, `EchoAi-Api-${stage}`, {
  env,
  description: 'Echo AI API Stack (API GW, Lambda, DynamoDB, SQS)',
  uiBucket: shared.uiBucketName,
  uiCloudFrontDomain: shared.uiCloudFrontDomainName,
});
