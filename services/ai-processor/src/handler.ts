/**
 * Placeholder SQS processor handler.
 *
 * The final implementation will consume messages emitted by the document upload workflow
 * and call the summarisation routines shared via `@echo-ai/documents`.
 */
export async function handler() {
  return {
    status: 'pending',
    message: 'AI processor implementation is not yet migrated from Next.js routes.',
  } as const;
}
