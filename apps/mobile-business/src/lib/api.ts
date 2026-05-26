import { getSupabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333';

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

export interface RequestOptions {
  /** Tenant alvo — vira X-Tenant-Id no header. Necessário em rotas tenant-scoped. */
  tenantId?: string;
}

async function authHeader(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Quando uma chamada autenticada volta 401, o token Supabase
 * provavelmente expirou ou foi revogado. Forçamos signOut local —
 * o onAuthStateChange em session.tsx leva o usuário pro /login.
 *
 * Exceção: rotas onde o 401 é legítimo de domínio (não auth). Hoje
 * /me/employee/link é a única que poderia retornar 401 por motivo
 * de negócio, mas no design atual ela retorna 404 ("não vinculado"),
 * então tratar 401 como "token inválido" é seguro.
 */
async function handleUnauthorized(): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  } catch {
    // signOut falhando aqui não tem o que fazer — onAuthStateChange
    // não vai disparar mas o erro 401 já vai borbulhar pra UI.
  }
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
    if (res.status === 401) {
      void handleUnauthorized();
    }
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
