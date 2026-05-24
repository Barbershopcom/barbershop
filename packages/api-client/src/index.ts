// Public surface of @barbearia/api-client.
//
// types.gen.ts é gerado por `pnpm --filter @barbearia/api-client generate`
// a partir do Swagger do backend (API_OPENAPI_URL=http://localhost:3333/docs-json).
// O arquivo gerado é commitado pra que web e mobile sempre tenham tipos sem
// precisar rodar o backend.

export { ApiError, createApiClient, type ApiClient, type ApiClientOptions } from './client';
