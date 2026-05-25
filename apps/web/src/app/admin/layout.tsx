import type { ReactNode } from 'react';

import { ActiveTenantProvider } from '@/lib/active-tenant';

import { AdminShell } from './_shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ActiveTenantProvider>
      <AdminShell>{children}</AdminShell>
    </ActiveTenantProvider>
  );
}
