'use client';

import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : `API error ${status}`;
    super(message);
    this.name = 'ApiError';
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export interface RequestOptions {
  /** Tenant alvo — vira X-Tenant-Id no header. Necessário em rotas tenant-scoped. */
  tenantId?: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const auth = await authHeader();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
    ...auth,
  };
  if (opts?.tenantId) headers['x-tenant-id'] = opts.tenantId;

  const res = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const parsed: unknown =
    contentType.includes('application/json') && res.status !== 204
      ? await res.json()
      : await res.text();

  if (!res.ok) {
    throw new ApiError(res.status, parsed);
  }
  return parsed as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>('GET', path, undefined, opts),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('POST', path, body, opts),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PUT', path, body, opts),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', path, body, opts),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>('DELETE', path, undefined, opts),
};
