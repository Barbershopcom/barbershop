import type { ReactNode } from 'react';

import { ActiveTenantProvider } from '@/lib/active-tenant';
import { ActiveUnitProvider } from '@/lib/active-unit';

import { AdminShell } from './_shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ActiveTenantProvider>
      <ActiveUnitProvider>
        <AdminShell>{children}</AdminShell>
      </ActiveUnitProvider>
    </ActiveTenantProvider>
  );
}
