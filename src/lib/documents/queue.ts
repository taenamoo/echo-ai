import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient } from '@/lib/aws/sqs';
import { config } from '@/lib/config';

export async function enqueueSummarizeJob(userId: string, documentId: string) {
  const queueUrl = config.summarizeSqsQueueUrl;
  if (!queueUrl) throw new Error('SUMMARIZE_SQS_QUEUE_URL is not configured');
  const message = {
    type: 'DOCUMENT_SUMMARIZE',
    userId,
    documentId,
    requestedAt: new Date().toISOString(),
  };
  await sqsClient.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
  }));
}

