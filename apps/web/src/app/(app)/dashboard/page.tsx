'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

interface MeResponse {
  id: string;
  email: string | null;
  phone: string | null;
  role: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        if (active) {
          setError('NEXT_PUBLIC_API_URL não configurada em .env.local.');
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${apiUrl}/me`, {
          headers: { authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const body = await res.text();
          if (active) setError(`API ${res.status}: ${body}`);
          return;
        }
        const body = (await res.json()) as MeResponse;
        if (active) setMe(body);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Falha ao chamar /me');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Sessão ativa via Supabase Auth.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {me ? (
            <dl className="grid grid-cols-[5rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">id</dt>
              <dd className="break-all font-mono text-xs">{me.id}</dd>
              <dt className="text-muted-foreground">email</dt>
              <dd>{me.email ?? '—'}</dd>
              <dt className="text-muted-foreground">phone</dt>
              <dd>{me.phone ?? '—'}</dd>
              <dt className="text-muted-foreground">role</dt>
              <dd>{me.role ?? '—'}</dd>
            </dl>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sair
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
