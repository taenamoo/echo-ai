import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class EchoAiSharedStack extends cdk.Stack {
  public readonly uiBucketName: string;
  public readonly uiCloudFrontDomainName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const uiBucket = new s3.Bucket(this, 'UiBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Use L1 CfnOriginAccessControl for broad CDK compatibility
    const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        name: `${id}-oac`,
        description: 'OAC for S3 UI bucket',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    const dist = new cloudfront.Distribution(this, 'UiDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(uiBucket, {
          originAccessIdentity: undefined,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      comment: `${id} SPA distribution`,
    });

    // Attach OAC (low-level override)
    const cfnDist = dist.node.defaultChild as cloudfront.CfnDistribution;
    cfnDist.addPropertyOverride(
      'DistributionConfig.Origins.0.OriginAccessControlId',
      oac.attrId
    );

    this.uiBucketName = uiBucket.bucketName;
    this.uiCloudFrontDomainName = dist.distributionDomainName;

    new cdk.CfnOutput(this, 'UiBucketName', { value: uiBucket.bucketName });
    new cdk.CfnOutput(this, 'UiCloudFrontDomain', {
      value: dist.distributionDomainName,
    });
    new cdk.CfnOutput(this, 'UiCloudFrontDistributionId', {
      value: dist.distributionId,
    });
  }
}
