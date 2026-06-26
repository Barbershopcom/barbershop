'use client';

import { useEffect, useRef, useState } from 'react';

import { MpCardFields, type MpCardFieldsHandle } from '@/components/mp-card-fields';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActiveTenant } from '@/lib/active-tenant';
import { api, ApiError } from '@/lib/api';

interface SubscriptionDto {
  status: string;
  billingCycle: string;
  priceCents: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Em teste grátis',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  suspended: 'Suspensa',
  cancelled: 'Cancelada',
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
}

export default function AssinaturaPage() {
  const { tenant } = useActiveTenant();
  const [sub, setSub] = useState<SubscriptionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  // Atualização de cartão.
  const [editingCard, setEditingCard] = useState(false);
  const cardRef = useRef<MpCardFieldsHandle>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [cpf, setCpf] = useState('');
  const [cardMsg, setCardMsg] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<SubscriptionDto | null>('/admin/subscription', {
        tenantId: tenant.id,
      });
      setSub(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar a assinatura.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  async function handleCancel() {
    if (!confirm('Cancelar a assinatura? A barbearia deixará de receber novos agendamentos.')) return;
    setError(null);
    setActing(true);
    try {
      await api.post('/admin/subscription/cancel', undefined, { tenantId: tenant.id });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cancelar.');
    } finally {
      setActing(false);
    }
  }

  async function handleUpdateCard() {
    setCardMsg(null);
    if (!cardholderName.trim() || cpf.replace(/\D/g, '').length !== 11) {
      setCardMsg('Informe o nome no cartão e um CPF válido.');
      return;
    }
    setActing(true);
    try {
      const cardTokenId = await cardRef.current!.tokenize(cardholderName.trim(), cpf);
      await api.post('/admin/subscription/update-card', { cardTokenId }, { tenantId: tenant.id });
      setCardMsg('Cartão atualizado com sucesso.');
      setEditingCard(false);
      await load();
    } catch (err) {
      setCardMsg(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Falha ao atualizar o cartão.',
      );
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plano da plataforma, status da cobrança e meio de pagamento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano</CardTitle>
          <CardDescription>Cobrança recorrente via Mercado Pago.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !sub ? (
            <p className="text-sm text-muted-foreground">Nenhuma assinatura encontrada.</p>
          ) : (
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{STATUS_LABEL[sub.status] ?? sub.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Plano</dt>
                <dd className="font-medium">
                  {sub.billingCycle === 'annual' ? 'Anual' : 'Mensal'} · {formatBRL(sub.priceCents)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fim do teste grátis</dt>
                <dd className="font-medium">{formatDate(sub.trialEndsAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Próximo débito</dt>
                <dd className="font-medium">{formatDate(sub.currentPeriodEnd)}</dd>
              </div>
            </dl>
          )}

          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}

          {editingCard ? (
            <div className="space-y-3 rounded-md border border-input p-4">
              <div className="space-y-2">
                <Label htmlFor="ch-name">Nome impresso no cartão</Label>
                <Input
                  id="ch-name"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  disabled={acting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ch-cpf">CPF do titular</Label>
                <Input
                  id="ch-cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  disabled={acting}
                />
              </div>
              <MpCardFields ref={cardRef} />
              {cardMsg ? <p className="text-sm text-muted-foreground">{cardMsg}</p> : null}
              <div className="flex gap-2">
                <Button onClick={handleUpdateCard} disabled={acting}>
                  {acting ? 'Salvando…' : 'Salvar cartão'}
                </Button>
                <Button variant="outline" onClick={() => setEditingCard(false)} disabled={acting}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
        {sub && !editingCard ? (
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingCard(true)} disabled={acting}>
              Atualizar cartão
            </Button>
            {sub.status !== 'cancelled' ? (
              <Button variant="outline" onClick={handleCancel} disabled={acting}>
                Cancelar assinatura
              </Button>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
