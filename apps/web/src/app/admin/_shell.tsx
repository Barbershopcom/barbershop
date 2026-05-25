'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useActiveTenant } from '@/lib/active-tenant';

const navItems = [
  { href: '/admin', label: 'Início' },
  { href: '/admin/services', label: 'Serviços' },
  { href: '/admin/team', label: 'Equipe' },
  { href: '/admin/hours', label: 'Horários' },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { tenant } = useActiveTenant();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Painel admin
            </div>
            <div className="text-base font-semibold">{tenant.name}</div>
          </div>
          <nav className="flex gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
