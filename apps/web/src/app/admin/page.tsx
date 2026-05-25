'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useActiveTenant } from '@/lib/active-tenant';

export default function AdminHome() {
  const { tenant, roles } = useActiveTenant();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
        <p className="text-sm text-muted-foreground">
          /b/{tenant.slug} · {tenant.timezone} · papéis: {roles.join(', ') || '—'}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Serviços</CardTitle>
            <CardDescription>Catálogo da barbearia</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/services">Gerenciar</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>Em breve (Sprint 1 Phase 5)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled>
              Em breve
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
