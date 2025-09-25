import { SendMessageCommand, GetQueueUrlCommand, CreateQueueCommand } from '@aws-sdk/client-sqs';
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

  try {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
      })
    );
  } catch (err: any) {
    // Local dev ergonomics: if queue is missing in LocalStack, attempt to create once
    const code = err?.Code || err?.code || err?.name;
    const isNonExistent =
      code === 'AWS.SimpleQueueService.NonExistentQueue' ||
      code === 'QueueDoesNotExist' ||
      (typeof err?.message === 'string' && err.message.includes('NonExistentQueue'));
    if (config.stage === 'local' && isNonExistent) {
      const ensuredUrl = await ensureLocalQueue(queueUrl).catch(() => null);
      if (ensuredUrl) {
        await sqsClient.send(
          new SendMessageCommand({
            QueueUrl: ensuredUrl,
            MessageBody: JSON.stringify(message),
          })
        );
        return;
      }
    }
    throw err;
  }
}

function queueNameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

async function ensureLocalQueue(initialUrl: string): Promise<string | null> {
  const name = queueNameFromUrl(initialUrl) || process.env.SUMMARIZE_SQS_QUEUE_NAME || 'echoai-summarize-queue';
  try {
    const getRes = await sqsClient.send(new GetQueueUrlCommand({ QueueName: name }));
    if (getRes.QueueUrl) return getRes.QueueUrl;
  } catch {
    // not found → create
  }
  try {
    const createRes = await sqsClient.send(new CreateQueueCommand({ QueueName: name }));
    return createRes.QueueUrl || initialUrl;
  } catch {
    return null;
  }
}
