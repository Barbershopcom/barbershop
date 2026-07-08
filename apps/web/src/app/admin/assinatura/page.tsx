'use client';

import { BILLING_TIERS, PLAN_LIMITS, type PlanTier } from '@barbearia/schemas';
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
  tier: string;
  status: string;
  billingCycle: string;
  priceCents: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

const TIER_LABEL: Record<string, string> = { free: 'Free', basic: 'Basic', pro: 'Pro' };

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

  // Troca de plano. free→pago exige cartão (MpCardFields no mesmo padrão acima).
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);
  const [planMsg, setPlanMsg] = useState<string | null>(null);
  const upgradeCardRef = useRef<MpCardFieldsHandle>(null);
  const [upName, setUpName] = useState('');
  const [upCpf, setUpCpf] = useState('');

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

  async function changePlan(tier: PlanTier) {
    if (!sub) return;
    setPlanMsg(null);

    // free → pago: precisa tokenizar cartão primeiro (abre o bloco de cartão).
    const needsCard = sub.tier === 'free' && tier !== 'free';
    if (needsCard && pendingTier !== tier) {
      setPendingTier(tier);
      return;
    }

    let cardTokenId: string | undefined;
    if (needsCard) {
      if (!upName.trim() || upCpf.replace(/\D/g, '').length !== 11) {
        setPlanMsg('Informe o nome no cartão e um CPF válido.');
        return;
      }
    } else {
      const label = TIER_LABEL[tier] ?? tier;
      if (!confirm(`Mudar para o plano ${label}? A cobrança é ajustada no Mercado Pago.`)) return;
    }

    setActing(true);
    try {
      if (needsCard) {
        cardTokenId = await upgradeCardRef.current!.tokenize(upName.trim(), upCpf);
      }
      await api.post(
        '/admin/subscription/change-plan',
        { tier, ...(cardTokenId ? { cardTokenId } : {}) },
        { tenantId: tenant.id },
      );
      setPendingTier(null);
      setPlanMsg('Plano atualizado.');
      await load();
    } catch (err) {
      setPlanMsg(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Não foi possível mudar o plano.',
      );
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
                  {TIER_LABEL[sub.tier] ?? sub.tier}
                  {sub.tier === 'free'
                    ? ' · grátis'
                    : ` · ${sub.billingCycle === 'annual' ? 'Anual' : 'Mensal'} · ${formatBRL(sub.priceCents)}`}
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
        {sub && sub.tier !== 'free' && !editingCard ? (
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

      {sub ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mudar de plano</CardTitle>
            <CardDescription>
              O ciclo de cobrança atual ({sub.billingCycle === 'annual' ? 'Anual' : 'Mensal'}) é
              mantido. Downgrade exige que unidades e equipe caibam no plano novo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(BILLING_TIERS) as PlanTier[]).map((tier) => {
                const limits = PLAN_LIMITS[tier];
                const price =
                  sub.billingCycle === 'annual'
                    ? BILLING_TIERS[tier].annual
                    : BILLING_TIERS[tier].monthly;
                const current = sub.tier === tier;
                return (
                  <div
                    key={tier}
                    className={`rounded-lg border p-4 ${current ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{TIER_LABEL[tier]}</span>
                      {current ? (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Plano atual
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {price === 0 ? 'Grátis' : `${formatBRL(price)}/${sub.billingCycle === 'annual' ? 'ano' : 'mês'}`}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {limits.maxUnits} unidade{limits.maxUnits > 1 ? 's' : ''} · até{' '}
                      {limits.maxEmployeesPerUnit} barbeiros/unidade
                    </p>
                    {!current ? (
                      <Button
                        className="mt-3 w-full"
                        variant="outline"
                        size="sm"
                        disabled={acting}
                        onClick={() => changePlan(tier)}
                      >
                        {sub.tier === 'free' && tier !== 'free' ? 'Assinar' : 'Mudar para este'}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {pendingTier ? (
              <div className="space-y-3 rounded-md border border-input p-4">
                <p className="text-sm font-medium">
                  Assinar o plano {TIER_LABEL[pendingTier]} — informe o cartão (sem novo teste
                  grátis).
                </p>
                <div className="space-y-2">
                  <Label htmlFor="up-name">Nome impresso no cartão</Label>
                  <Input
                    id="up-name"
                    value={upName}
                    onChange={(e) => setUpName(e.target.value)}
                    disabled={acting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="up-cpf">CPF do titular</Label>
                  <Input
                    id="up-cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={upCpf}
                    onChange={(e) => setUpCpf(e.target.value)}
                    disabled={acting}
                  />
                </div>
                <MpCardFields ref={upgradeCardRef} />
                <div className="flex gap-2">
                  <Button onClick={() => changePlan(pendingTier)} disabled={acting}>
                    {acting ? 'Processando…' : 'Confirmar assinatura'}
                  </Button>
                  <Button variant="outline" onClick={() => setPendingTier(null)} disabled={acting}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}

            {planMsg ? <p className="text-sm text-muted-foreground">{planMsg}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
