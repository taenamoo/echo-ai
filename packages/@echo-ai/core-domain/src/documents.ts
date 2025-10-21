export type DocumentStatus = 'UPLOADED' | 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export type DocumentItem = {
  PK: string;
  SK: string;
  userId: string;
  documentId: string;
  filename: string;
  s3Key: string;
  filetype: string | null;
  filesize: number | null;
  status: DocumentStatus;
  summaryText?: string;
  tags?: string[];
  tagKey?: string;
  createdAt: string;
  updatedAt?: string;
};

export type DocumentContentItem = {
  PK: string;
  SK: string;
  userId: string;
  documentId: string;
  contentS3Key: string | null;
  summaryText: string | null;
  textLength?: number | null;
  chunkSize?: number | null;
  chunkCount?: number | null;
  lastProcessedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type PdfParse = (
  data: Buffer,
  options?: { version?: string }
) => Promise<{ text?: string }>;
