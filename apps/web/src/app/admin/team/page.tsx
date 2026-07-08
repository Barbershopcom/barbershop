'use client';

import {
  type CreateEmployeeInput,
  createEmployeeSchema,
  type EmployeeDto,
  employeeRoles,
} from '@barbearia/schemas';
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
import { api, ApiError } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';
import { useActiveUnit } from '@/lib/active-unit';

const roleLabel: Record<(typeof employeeRoles)[number], string> = {
  admin: 'Admin',
  barber: 'Barbeiro',
  admin_barber: 'Admin + Barbeiro',
};

export default function TeamPage() {
  const { tenant } = useActiveTenant();
  const { activeUnit } = useActiveUnit();
  const [employees, setEmployees] = useState<EmployeeDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { displayName: '', email: '', role: 'barber', isActive: true },
  });

  async function refresh() {
    setLoadError(null);
    try {
      const data = await api.get<EmployeeDto[]>(
        `/employees?includeInactive=true&barbershopId=${activeUnit.id}`,
        { tenantId: tenant.id },
      );
      setEmployees(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao listar funcionários');
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id, activeUnit.id]);

  function startCreate() {
    setEditingId(null);
    setSubmitError(null);
    form.reset({ displayName: '', email: '', role: 'barber', isActive: true });
    setShowForm(true);
  }

  function startEdit(e: EmployeeDto) {
    setEditingId(e.id);
    setSubmitError(null);
    form.reset({
      displayName: e.displayName,
      email: e.email ?? '',
      role: e.role,
      isActive: e.isActive,
    });
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setSubmitError(null);
  }

  async function onSubmit(values: CreateEmployeeInput) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/admin/employees/${editingId}`, values, { tenantId: tenant.id });
      } else {
        await api.post(`/admin/employees?barbershopId=${activeUnit.id}`, values, {
          tenantId: tenant.id,
        });
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
    if (!confirm('Desativar este funcionário? Pode reativar depois.')) return;
    try {
      await api.delete(`/admin/employees/${id}`, { tenantId: tenant.id });
      await refresh();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erro ao desativar');
    }
  }

  async function reactivate(id: string) {
    try {
      await api.patch(`/admin/employees/${id}`, { isActive: true }, { tenantId: tenant.id });
      await refresh();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erro ao reativar');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted-foreground">
            Funcionários da barbearia (barbeiros e admins)
          </p>
        </div>
        {!showForm ? (
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4" />
            Novo funcionário
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar funcionário' : 'Novo funcionário'}</CardTitle>
            <CardDescription>
              Email é opcional no MVP — convite por email entra no Sprint 2+.
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
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Jajá Teste" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (opcional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="joao@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Papel</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...field}
                        >
                          {employeeRoles.map((r) => (
                            <option key={r} value={r}>
                              {roleLabel[r]}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                      <FormLabel className="!mt-0 font-normal">Ativo</FormLabel>
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
      ) : employees === null ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum funcionário cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead className="border-b bg-muted/40 text-left text-sm">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Papel</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {employees.map((e) => (
                <tr key={e.id} className={e.isActive ? '' : 'opacity-50'}>
                  <td className="px-4 py-2 font-medium">{e.displayName}</td>
                  <td className="px-4 py-2 text-muted-foreground">{e.email ?? '—'}</td>
                  <td className="px-4 py-2">{roleLabel[e.role]}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.isActive
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {e.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(e)}
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {e.isActive ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deactivate(e.id)}
                          aria-label="Desativar"
                          title="Desativar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => reactivate(e.id)}
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
