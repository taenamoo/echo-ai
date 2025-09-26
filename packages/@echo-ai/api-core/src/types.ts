export type NormalizedRequest = {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
  body?: string | null;
};

export type NormalizedResponse = {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
};

