'use client';

import {
  type CreateUnitInput,
  createUnitSchema,
  type UnitDto,
} from '@barbearia/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Pencil, Plus, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';
import { useActiveUnit } from '@/lib/active-unit';

const TIER_LABEL: Record<string, string> = { free: 'Free', basic: 'Basic', pro: 'Pro' };

function isPlanLimitError(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 409 &&
    typeof err.body === 'object' &&
    err.body !== null &&
    (err.body as { code?: string }).code === 'PLAN_LIMIT_REACHED'
  );
}

export default function UnidadesPage() {
  const { tenant } = useActiveTenant();
  const { units, limit, tier, refresh } = useActiveUnit();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeCount = units.filter((u) => u.isActive).length;
  const atLimit = activeCount >= limit;

  const form = useForm<CreateUnitInput>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      name: '',
      slug: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: 'SP',
      postalCode: '',
    },
  });

  function startCreate() {
    setEditingId(null);
    setSubmitError(null);
    setLimitHit(false);
    form.reset({
      name: '',
      slug: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: 'SP',
      postalCode: '',
    });
    setShowForm(true);
  }

  function startEdit(u: UnitDto) {
    setEditingId(u.id);
    setSubmitError(null);
    setLimitHit(false);
    form.reset({
      name: u.name,
      slug: u.slug,
      addressLine1: u.addressLine1,
      addressLine2: '',
      city: u.city,
      state: 'SP',
      postalCode: '',
    });
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setSubmitError(null);
  }

  async function onSubmit(values: CreateUnitInput) {
    setSubmitError(null);
    setLimitHit(false);
    setSubmitting(true);
    try {
      if (editingId) {
        // No edit só enviamos o que a tela edita de verdade (nome/slug/endereço).
        const { addressLine2, postalCode, ...rest } = values;
        await api.patch(
          `/admin/units/${editingId}`,
          {
            ...rest,
            ...(addressLine2 ? { addressLine2 } : {}),
            ...(postalCode ? { postalCode } : {}),
          },
          { tenantId: tenant.id },
        );
      } else {
        await api.post('/admin/units', values, { tenantId: tenant.id });
      }
      await refresh();
      cancel();
    } catch (err) {
      if (isPlanLimitError(err)) setLimitHit(true);
      setSubmitError(err instanceof ApiError ? err.message : 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(u: UnitDto) {
    setActionError(null);
    setLimitHit(false);
    if (u.isActive && !confirm(`Desativar a unidade "${u.name}"? Ela some do link público.`)) {
      return;
    }
    try {
      await api.patch(`/admin/units/${u.id}`, { isActive: !u.isActive }, { tenantId: tenant.id });
      await refresh();
    } catch (err) {
      if (isPlanLimitError(err)) setLimitHit(true);
      setActionError(err instanceof ApiError ? err.message : 'Erro inesperado');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} de {limit} unidades do plano {TIER_LABEL[tier] ?? tier}
          </p>
        </div>
        {!showForm ? (
          atLimit ? (
            <Button asChild variant="outline">
              <Link href="/admin/assinatura">Limite do plano atingido — fazer upgrade</Link>
            </Button>
          ) : (
            <Button onClick={startCreate}>
              <Plus className="h-4 w-4" />
              Nova unidade
            </Button>
          )
        ) : null}
      </div>

      {(limitHit || actionError) && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {actionError ?? submitError}{' '}
          {limitHit && (
            <Link href="/admin/assinatura" className="font-semibold underline underline-offset-2">
              Ver planos
            </Link>
          )}
        </div>
      )}

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar unidade' : 'Nova unidade'}</CardTitle>
            <CardDescription>
              Cada unidade tem seu próprio link público de agendamento (/b/slug).
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da unidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Navalha — Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug (link público)</FormLabel>
                      <FormControl>
                        <Input placeholder="navalha-centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua Aurora, 120" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                          <Input placeholder="SP" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input placeholder="01000-000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {submitError && !limitHit ? (
                  <p className="text-sm text-destructive">{submitError}</p>
                ) : null}
                {limitHit ? (
                  <p className="text-sm text-amber-700">
                    {submitError}{' '}
                    <Link href="/admin/assinatura" className="font-semibold underline">
                      Fazer upgrade
                    </Link>
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Salvando…' : editingId ? 'Salvar' : 'Criar unidade'}
                </Button>
                <Button type="button" variant="ghost" onClick={cancel}>
                  Cancelar
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {units.map((u) => (
          <Card key={u.id} className={u.isActive ? '' : 'opacity-60'}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  {u.name}
                  {!u.isActive && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Inativa
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {u.addressLine1} · {u.city} · {u.employeeCount} funcionário(s)
                </CardDescription>
                <a
                  href={`/b/${u.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
                >
                  /b/{u.slug}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => startEdit(u)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant={u.isActive ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => toggleActive(u)}
                >
                  {u.isActive ? (
                    'Desativar'
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Reativar
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
