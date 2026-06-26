'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useActiveTenant } from '@/lib/active-tenant';
import { api } from '@/lib/api';

const navItems = [
  { href: '/admin', label: 'Início' },
  { href: '/admin/agenda', label: 'Agenda' },
  { href: '/admin/services', label: 'Serviços' },
  { href: '/admin/team', label: 'Equipe' },
  { href: '/admin/hours', label: 'Horários' },
  { href: '/admin/pagamentos', label: 'Pagamentos' },
  { href: '/admin/assinatura', label: 'Assinatura' },
  { href: '/admin/perfil', label: 'Perfil' },
] as const;

/** Banner de cobrança quando a assinatura está pendente/suspensa. */
function SubscriptionBanner({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ status: string } | null>('/admin/subscription', { tenantId })
      .then((s) => {
        if (!cancelled) setStatus(s?.status ?? null);
      })
      .catch(() => {
        /* silencioso: o banner é best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (!status || status === 'trialing' || status === 'active') return null;

  const pastDue = status === 'past_due';
  return (
    <div
      className={cn(
        'px-6 py-2 text-center text-sm',
        pastDue ? 'bg-amber-100 text-amber-900' : 'bg-destructive/10 text-destructive',
      )}
    >
      {pastDue
        ? 'Pagamento pendente — atualize o cartão para não perder o acesso. '
        : 'Assinatura suspensa — novos agendamentos estão bloqueados. '}
      <Link href="/admin/assinatura" className="font-semibold underline underline-offset-2">
        Ver assinatura
      </Link>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { tenant } = useActiveTenant();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.post('/auth/logout', {});
      router.replace('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

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
          <div className="flex items-center gap-4">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </div>
      </header>
      <SubscriptionBanner tenantId={tenant.id} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
