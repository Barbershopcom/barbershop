/**
 * Wrapper fetch tipado. Versão inicial sem dependência de tipos gerados —
 * substituir por client gerado via openapi-fetch quando types.gen.ts existir.
 */

export interface ApiClientOptions {
  baseUrl: string;
  /** Função que retorna o JWT atual (Supabase access_token). Pode ser async. */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Headers extras a anexar em toda request. */
  defaultHeaders?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `API error ${status}`);
    this.name = 'ApiError';
  }
}

export interface ApiClient {
  get<T = unknown>(path: string, init?: RequestInit): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  delete<T = unknown>(path: string, init?: RequestInit): Promise<T>;
}

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const { baseUrl, getAccessToken, defaultHeaders = {} } = opts;
  const trimmed = baseUrl.replace(/\/$/, '');

  async function request<T>(method: string, path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const token = (await getAccessToken?.()) ?? null;
    const headers = new Headers({
      'content-type': 'application/json',
      accept: 'application/json',
      ...defaultHeaders,
      ...(init?.headers as Record<string, string> | undefined),
    });
    if (token) headers.set('authorization', `Bearer ${token}`);

    const res = await fetch(`${trimmed}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
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

  return {
    get: (p, i) => request('GET', p, undefined, i),
    post: (p, b, i) => request('POST', p, b, i),
    put: (p, b, i) => request('PUT', p, b, i),
    patch: (p, b, i) => request('PATCH', p, b, i),
    delete: (p, i) => request('DELETE', p, undefined, i),
  };
}
