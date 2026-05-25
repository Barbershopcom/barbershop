'use client';

import { type CreateServiceInput, createServiceSchema, type ServiceDto } from '@barbearia/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function duration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export default function ServicesPage() {
  const { tenant } = useActiveTenant();
  const [services, setServices] = useState<ServiceDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: { name: '', description: '', durationMin: 30, basePriceCents: 0, isActive: true },
  });

  async function refresh() {
    setLoadError(null);
    try {
      const data = await api.get<ServiceDto[]>('/services?includeInactive=true', {
        tenantId: tenant.id,
      });
      setServices(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao listar serviços');
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  function startCreate() {
    setEditingId(null);
    setSubmitError(null);
    form.reset({ name: '', description: '', durationMin: 30, basePriceCents: 0, isActive: true });
    setShowForm(true);
  }

  function startEdit(service: ServiceDto) {
    setEditingId(service.id);
    setSubmitError(null);
    form.reset({
      name: service.name,
      description: service.description ?? '',
      durationMin: service.durationMin,
      basePriceCents: service.basePriceCents,
      isActive: service.isActive,
    });
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setSubmitError(null);
  }

  async function onSubmit(values: CreateServiceInput) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/services/${editingId}`, values, { tenantId: tenant.id });
      } else {
        await api.post('/services', values, { tenantId: tenant.id });
      }
      await refresh();
      cancel();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(id: string) {
    if (!confirm('Desativar este serviço? Pode reativar depois.')) return;
    try {
      await api.delete(`/services/${id}`, { tenantId: tenant.id });
      await refresh();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erro ao desativar');
    }
  }

  async function reactivate(id: string) {
    try {
      await api.patch(`/services/${id}`, { isActive: true }, { tenantId: tenant.id });
      await refresh();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erro ao reativar');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">Catálogo da sua barbearia</p>
        </div>
        {!showForm ? (
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4" />
            Novo serviço
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar serviço' : 'Novo serviço'}</CardTitle>
            <CardDescription>
              Defina nome, duração e preço. Você pode desativar depois.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                const flat = Object.entries(errors)
                  .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                  .join(' · ');
                setSubmitError(`Validação falhou — ${flat}`);
              })}
            >
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Corte masculino" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="durationMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (min)</FormLabel>
                        <FormControl>
                          <Input type="number" min={5} step={5} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="basePriceCents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço (centavos)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step={100} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value ?? true}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 font-normal">
                        Ativo (aparece no catálogo público)
                      </FormLabel>
                    </FormItem>
                  )}
                />
                {submitError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {submitError}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancel} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Salvando…' : editingId ? 'Salvar' : 'Criar'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      ) : null}

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : services === null ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum serviço cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead className="border-b bg-muted/40 text-left text-sm">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Duração</th>
                <th className="px-4 py-2 font-medium">Preço</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {services.map((s) => (
                <tr key={s.id} className={s.isActive ? '' : 'opacity-50'}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{s.name}</div>
                    {s.description ? (
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{duration(s.durationMin)}</td>
                  <td className="px-4 py-2 tabular-nums">{brl(s.basePriceCents)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.isActive
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {s.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(s)}
                        aria-label="Editar"
                        title="Editar este serviço"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {s.isActive ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deactivate(s.id)}
                          aria-label="Desativar"
                          title="Desativar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => reactivate(s.id)}
                          aria-label="Reativar"
                          title="Reativar"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
