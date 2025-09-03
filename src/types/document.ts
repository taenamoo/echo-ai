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
  createdAt: string;
  updatedAt?: string;
};

