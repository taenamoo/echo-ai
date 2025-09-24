import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient } from '@echo-ai/aws-clients';
import { getConfig } from '@echo-ai/config';

type SummarizeMessage = {
  type: 'DOCUMENT_SUMMARIZE';
  userId: string;
  documentId: string;
  requestedAt: string;
};

export async function enqueueSummarizeJob(userId: string, documentId: string): Promise<void> {
  const config = getConfig();
  const queueUrl = config.summarizeSqsQueueUrl;

  if (!queueUrl) {
    throw new Error('SUMMARIZE_SQS_QUEUE_URL is not configured');
  }

  const message: SummarizeMessage = {
    type: 'DOCUMENT_SUMMARIZE',
    userId,
    documentId,
    requestedAt: new Date().toISOString(),
  };

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
    })
  );
}
