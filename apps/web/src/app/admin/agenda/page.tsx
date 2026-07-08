'use client';

import type {
  AdminAppointmentItem,
  EmployeeDto,
  ServiceDto,
} from '@barbearia/schemas';
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
} from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';
import { useActiveUnit } from '@/lib/active-unit';

/**
 * Calendar view do admin. ADR-008.
 *
 * - FullCalendar week/day com drag-to-reschedule
 * - Click event = cancel
 * - "Novo agendamento" abre form inline (também acionado por seleção no calendar)
 */
export default function AdminAgendaPage() {
  const { tenant } = useActiveTenant();
  const { activeUnit } = useActiveUnit();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [barberFilter, setBarberFilter] = useState<string>('');
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  const [items, setItems] = useState<AdminAppointmentItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [visibleRange, setVisibleRange] = useState<{ from: string; to: string } | null>(
    null,
  );

  // Form "Novo agendamento"
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState<string>(''); // YYYY-MM-DD (hora local do browser)
  const [formTime, setFormTime] = useState<string>(''); // HH:MM (24h)
  const [formService, setFormService] = useState<string>('');
  const [formBarber, setFormBarber] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api
        .get<EmployeeDto[]>(`/employees?includeInactive=false&barbershopId=${activeUnit.id}`, { tenantId: tenant.id })
        .then((data) => setEmployees(data.filter((e) => e.role !== 'admin'))),
      api
        .get<ServiceDto[]>(`/admin/services?barbershopId=${activeUnit.id}`, { tenantId: tenant.id })
        .then(setServices),
    ]).catch(() => undefined);
  }, [tenant.id, activeUnit.id]);

  const load = useCallback(async () => {
    if (!visibleRange) return;
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        from: visibleRange.from,
        to: visibleRange.to,
      });
      if (barberFilter) params.set('barberId', barberFilter);
      params.set('barbershopId', activeUnit.id);
      if (includeAllStatuses) params.set('includeAllStatuses', 'true');
      const data = await api.get<AdminAppointmentItem[]>(
        `/admin/appointments?${params.toString()}`,
      );
      setItems(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar agenda');
    }
  }, [visibleRange, barberFilter, includeAllStatuses, activeUnit.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDatesSet = (arg: DatesSetArg) => {
    const from = formatYMD(arg.start);
    const endDate = new Date(arg.end.getTime() - 24 * 60 * 60 * 1000);
    const to = formatYMD(endDate);
    setVisibleRange((prev) => (prev?.from === from && prev?.to === to ? prev : { from, to }));
  };

  const events = useMemo(
    () =>
      items.map((a) => ({
        id: a.id,
        title: `${statusEmoji(a.status)} ${a.customerName} — ${a.service.name}`,
        start: a.startAt,
        end: a.endAt,
        backgroundColor: statusColor(a.status),
        borderColor: statusColor(a.status),
        textColor: a.status === 'confirmed' ? '#FFFFFF' : '#1a1a1a',
        editable: isActiveStatus(a.status), // só ativos podem ser arrastados
        extendedProps: { appt: a },
      })),
    [items],
  );

  async function handleEventDrop(arg: EventDropArg) {
    const appt = arg.event.extendedProps.appt as AdminAppointmentItem;
    const newStart = arg.event.start;
    if (!newStart) {
      arg.revert();
      return;
    }
    const newStartLabel = newStart.toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    if (!window.confirm(`Remarcar ${appt.customerName} para ${newStartLabel}?`)) {
      arg.revert();
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/admin/appointments/${appt.id}/reschedule`, {
        newStartAt: newStart.toISOString(),
      });
      await load();
    } catch (err) {
      arg.revert();
      window.alert(err instanceof ApiError ? err.message : 'Erro ao remarcar');
    } finally {
      setBusy(false);
    }
  }

  async function handleEventClick(arg: EventClickArg) {
    const appt = arg.event.extendedProps.appt as AdminAppointmentItem;
    if (!isActiveStatus(appt.status)) return;
    const label = new Date(appt.startAt).toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    if (!window.confirm(`Cancelar ${appt.customerName} em ${label}?`)) return;
    const reason = window.prompt('Motivo do cancelamento (opcional):') ?? '';
    setBusy(true);
    try {
      await api.patch(
        `/admin/appointments/${appt.id}/cancel`,
        reason.trim() ? { reason: reason.trim() } : {},
      );
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erro ao cancelar');
    } finally {
      setBusy(false);
    }
  }

  function openNewForm(startAt?: Date) {
    if (startAt) {
      const { date, time } = splitLocalDateTime(startAt);
      setFormDate(date);
      setFormTime(time);
    } else {
      setFormDate('');
      setFormTime('');
    }
    setFormError(null);
    setShowForm(true);
  }

  function handleDateSelect(arg: DateSelectArg) {
    openNewForm(arg.start);
    calendarRef.current?.getApi().unselect();
  }

  function closeForm() {
    setShowForm(false);
    setFormDate('');
    setFormTime('');
    setFormService('');
    setFormBarber('');
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormError(null);
  }

  async function submitNewAppointment(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formDate || !formTime) {
      setFormError('Selecione data e hora.');
      return;
    }
    if (formName.trim().length < 2) {
      setFormError('Nome do cliente é obrigatório (mín 2 chars).');
      return;
    }
    const startAt = new Date(`${formDate}T${formTime}:00`);
    if (Number.isNaN(startAt.getTime())) {
      setFormError('Data ou hora inválida.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/admin/appointments', {
        serviceId: formService,
        barberId: formBarber,
        startAt: startAt.toISOString(),
        customerName: formName.trim(),
        customerPhone: formPhone.trim() ? formPhone.trim() : null,
        customerEmail: formEmail.trim() ? formEmail.trim() : null,
      });
      closeForm();
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erro ao criar agendamento');
    } finally {
      setBusy(false);
    }
  }

  const barbersForService = useMemo(() => {
    // Filtro UI simples: por enquanto exibe todos os employees (backend valida capability)
    // Refinamento futuro: GET /employees?serviceId=... pra filtrar capability.
    return employees;
  }, [employees]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Arraste eventos pra remarcar. Clique pra cancelar.
          </p>
        </div>
        <Button onClick={() => openNewForm()} disabled={showForm}>
          <Plus className="mr-1 h-4 w-4" /> Novo agendamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="barber">Barbeiro</Label>
            <select
              id="barber"
              value={barberFilter}
              onChange={(e) => setBarberFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.displayName}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeAllStatuses}
              onChange={(e) => setIncludeAllStatuses(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Incluir cancelados / concluídos
          </label>
          <Button variant="outline" onClick={() => void load()} disabled={busy}>
            Atualizar
          </Button>
        </CardContent>
      </Card>

      {showForm ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Novo agendamento</CardTitle>
            <Button variant="ghost" size="sm" onClick={closeForm}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitNewAppointment} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="form-service">Serviço</Label>
                <select
                  id="form-service"
                  required
                  value={formService}
                  onChange={(e) => setFormService(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione...</option>
                  {services
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMin}min)
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-barber">Barbeiro</Label>
                <select
                  id="form-barber"
                  required
                  value={formBarber}
                  onChange={(e) => setFormBarber(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione...</option>
                  {barbersForService.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-date">Data</Label>
                <Input
                  id="form-date"
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-time">Hora ({tenant.timezone})</Label>
                <select
                  id="form-time"
                  required
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione...</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-name">Nome do cliente</Label>
                <Input
                  id="form-name"
                  required
                  minLength={2}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Jajá Teste"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-phone">Telefone (opcional)</Label>
                <Input
                  id="form-phone"
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+5511999999999"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-email">Email (opcional)</Label>
                <Input
                  id="form-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>

              {formError ? (
                <p className="md:col-span-2 text-sm text-destructive">{formError}</p>
              ) : null}

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={busy}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Criando...' : 'Criar agendamento'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {loadError ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay',
            }}
            locale="pt-br"
            buttonText={{ today: 'Hoje', week: 'Semana', day: 'Dia' }}
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            nowIndicator
            editable
            selectable
            selectMirror
            events={events}
            datesSet={handleDatesSet}
            eventDrop={handleEventDrop}
            eventClick={handleEventClick}
            select={handleDateSelect}
            height="auto"
          />
        </CardContent>
      </Card>

      {busy ? (
        <p className="text-center text-xs text-muted-foreground">Processando...</p>
      ) : null}
    </div>
  );
}

/** Cor por status (ADR-016 §3). Ativos = tons fortes; terminais = frios. */
function statusColor(status: AdminAppointmentItem['status']): string {
  switch (status) {
    case 'awaiting_payment':
      return '#D97706'; // âmbar escuro — falta pagar
    case 'pending':
      return '#F59E0B'; // amarelo — aguardando confirmação
    case 'confirmed':
      return '#357BE4'; // azul — confirmado
    case 'completed':
      return '#10B981'; // verde
    case 'cancelled':
      return '#E5E7EB'; // cinza claro
    case 'expired':
      return '#BF212F'; // vermelho
    case 'no_show':
      return '#9CA3AF'; // cinza médio
  }
}

function statusEmoji(status: AdminAppointmentItem['status']): string {
  switch (status) {
    case 'awaiting_payment':
      return '💳';
    case 'pending':
      return '⏳';
    case 'confirmed':
      return '';
    case 'completed':
      return '✅';
    case 'cancelled':
      return '❌';
    case 'expired':
      return '⌛';
    case 'no_show':
      return '⚠️';
  }
}

/** Status "ativos" que o admin pode arrastar/cancelar na agenda. */
function isActiveStatus(status: AdminAppointmentItem['status']): boolean {
  return status === 'awaiting_payment' || status === 'pending' || status === 'confirmed';
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Quebra Date em {date: YYYY-MM-DD, time: HH:MM} no fuso local do browser. */
function splitLocalDateTime(date: Date): { date: string; time: string } {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

/** Horários disponíveis no select — alinhados com slotDuration=30min do FullCalendar. */
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 7; h <= 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
})();
