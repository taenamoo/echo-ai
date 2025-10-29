import { Duration, RemovalPolicy, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BucketEncryption, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { Distribution, ViewerProtocolPolicy, CachePolicy, OriginRequestPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';

export interface EchoaiSharedProps extends StackProps { stage: string; }

export class EchoaiSharedStack extends Stack {
  public readonly uiBucketName: string;
  public readonly documentsBucketName: string;
  constructor(scope: Construct, id: string, props: EchoaiSharedProps) {
    super(scope, id, props);

    const removal = props.stage === 'production' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    const uiBucket = new Bucket(this, 'UiBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: removal,
      autoDeleteObjects: props.stage !== 'production',
    });

    const documentsBucket = new Bucket(this, 'DocumentsBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: removal,
      autoDeleteObjects: props.stage !== 'production',
    });

    // Basic CloudFront to serve UI from S3 (dev: no ACM cert here; prod: attach cert + domain)
    const dist = new Distribution(this, 'UiDistribution', {
      defaultBehavior: {
        origin: new S3Origin(uiBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
      },
      comment: `EchoAI UI (${props.stage})`,
    });

    new CfnOutput(this, 'UiBucketName', { value: uiBucket.bucketName });
    new CfnOutput(this, 'DocumentsBucketName', { value: documentsBucket.bucketName });
    new CfnOutput(this, 'UiDistributionDomain', { value: dist.distributionDomainName });

    this.uiBucketName = uiBucket.bucketName;
    this.documentsBucketName = documentsBucket.bucketName;
  }
}

