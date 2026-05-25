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
      <div className="grid gap-4 sm:grid-cols-3">
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
            <CardDescription>Barbeiros e admins</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/team">Gerenciar</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Horários</CardTitle>
            <CardDescription>Funcionamento da loja</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/hours">Gerenciar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
