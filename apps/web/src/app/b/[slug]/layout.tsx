import type { ReactNode } from 'react';

/**
 * Layout das rotas públicas `/b/[slug]/*` (ADR-009).
 *
 * Sem `ActiveTenantProvider` ou `AdminShell` — o consumidor é o cliente
 * final, não admin logado. Tenant é resolvido por params em cada
 * server component que precisar.
 */
export default function PublicBookingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
