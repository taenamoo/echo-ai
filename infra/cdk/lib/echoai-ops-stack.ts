import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface EchoaiOpsProps extends StackProps { stage: string; }

export class EchoaiOpsStack extends Stack {
  constructor(scope: Construct, id: string, props: EchoaiOpsProps) {
    super(scope, id, props);
    // Placeholder for CloudWatch alarms/dashboards/log retention
    // Add detailed alarms in later steps
    new CfnOutput(this, 'OpsStage', { value: props.stage });
  }
}

