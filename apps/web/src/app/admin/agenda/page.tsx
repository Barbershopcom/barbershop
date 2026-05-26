'use client';

import type { AdminAppointmentItem, EmployeeDto } from '@barbearia/schemas';
import { Phone, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysString(s: string, days: number): string {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function groupByDate(items: AdminAppointmentItem[]): Map<string, AdminAppointmentItem[]> {
  const map = new Map<string, AdminAppointmentItem[]>();
  for (const item of items) {
    const dateKey = item.startAt.slice(0, 10);
    const list = map.get(dateKey) ?? [];
    list.push(item);
    map.set(dateKey, list);
  }
  return map;
}

export default function AdminAgendaPage() {
  useActiveTenant(); // garante tenant resolvido (mas não precisamos do id — endpoint /admin/* resolve via JWT)
  const [from, setFrom] = useState(todayString());
  const [to, setTo] = useState(addDaysString(todayString(), 6));
  const [barberId, setBarberId] = useState<string>('');
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [items, setItems] = useState<AdminAppointmentItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Carrega barbeiros uma vez pro filtro
  useEffect(() => {
    void api
      .get<EmployeeDto[]>('/employees?includeInactive=false')
      .then((data) => setEmployees(data.filter((e) => e.role !== 'admin')))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    setItems(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (barberId) params.set('barberId', barberId);
      const data = await api.get<AdminAppointmentItem[]>(
        `/admin/appointments?${params.toString()}`,
      );
      setItems(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar agenda');
    }
  }, [from, to, barberId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCancel(id: string, name: string, when: string) {
    if (!window.confirm(`Cancelar agendamento de ${name} em ${when}?`)) return;
    setCancellingId(id);
    try {
      await api.patch(`/admin/appointments/${id}/cancel`);
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erro ao cancelar');
    } finally {
      setCancellingId(null);
    }
  }

  const grouped = items ? groupByDate(items) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Appointments do tenant na janela selecionada. Default mostra só os ativos
          (booked).
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="from">De</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">Até</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="barber">Barbeiro</Label>
            <select
              id="barber"
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => void load()} className="w-full">
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loadError ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : items === null ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sem agendamentos</CardTitle>
            <CardDescription>
              Nenhum appointment marcado na janela selecionada.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped &&
            Array.from(grouped.entries()).map(([date, list]) => {
              const first = list[0];
              if (!first) return null;
              return (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {formatDate(first.startAt)}
                    </CardTitle>
                    <CardDescription>
                      {list.length} {list.length === 1 ? 'agendamento' : 'agendamentos'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y">
                  {list.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="w-20 shrink-0">
                        <div className="text-base font-semibold">
                          {formatTime(appt.startAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {appt.service.durationMin}min
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{appt.customerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {appt.service.name} · {appt.barber.displayName}
                        </div>
                      </div>
                      {appt.customerPhone ? (
                        <a
                          href={`tel:${appt.customerPhone}`}
                          className="rounded-md p-2 text-primary hover:bg-muted"
                          aria-label={`Ligar para ${appt.customerName}`}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={cancellingId === appt.id}
                        onClick={() =>
                          handleCancel(
                            appt.id,
                            appt.customerName,
                            `${formatDate(appt.startAt)} ${formatTime(appt.startAt)}`,
                          )
                        }
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">Cancelar</span>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
