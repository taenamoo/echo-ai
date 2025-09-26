import { ReceiveMessageCommand, DeleteMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { getConfig } from '@echo-ai/config';
import { handler } from './handler';
import { sqsClient as sharedSqsClient } from '@echo-ai/aws-clients';

function buildRecord(message: any): SQSRecord {
  return {
    messageId: message.MessageId!,
    receiptHandle: message.ReceiptHandle!,
    body: message.Body || '',
    attributes: {},
    messageAttributes: {},
    md5OfBody: message.MD5OfBody || '',
    eventSource: 'aws:sqs',
    eventSourceARN: 'localstack:sqs',
    awsRegion: getConfig().awsRegion,
  } as unknown as SQSRecord;
}

async function run() {
  const config = getConfig();
  const queueUrl = config.summarizeSqsQueueUrl;
  if (!queueUrl) {
    console.error('[ai-processor] SUMMARIZE_SQS_QUEUE_URL is not set');
    process.exit(1);
  }
  const client: SQSClient = sharedSqsClient;
  console.log(`[ai-processor] Starting local runner. Queue: ${queueUrl}`);

  let stopped = false;
  process.on('SIGINT', () => {
    stopped = true;
  });

  while (!stopped) {
    try {
      const res = await client.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 10,
          VisibilityTimeout: 30,
        })
      );
      const messages = res.Messages || [];
      if (messages.length === 0) continue;

      const records: SQSRecord[] = messages.map(buildRecord);
      const event: SQSEvent = { Records: records } as any;
      const result = await handler(event);
      const failedIds = new Set((result?.batchItemFailures || []).map((f) => f.itemIdentifier));
      const toDelete = messages.filter((m) => !failedIds.has(m.MessageId!));

      if (toDelete.length > 0) {
        await client.send(
          new DeleteMessageBatchCommand({
            QueueUrl: queueUrl,
            Entries: toDelete.map((m) => ({ Id: m.MessageId!, ReceiptHandle: m.ReceiptHandle! })),
          })
        );
        console.log(`[ai-processor] Deleted ${toDelete.length}/${messages.length} messages`);
      }
    } catch (err) {
      console.error('[ai-processor] Poll error:', err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.log('[ai-processor] Stopped');
}

run().catch((e) => {
  console.error('[ai-processor] Fatal error:', e);
  process.exit(1);
});

