'use client';

import type { AdminAppointmentItem, EmployeeDto } from '@barbearia/schemas';
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
} from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';

/**
 * Calendar view do admin. Substitui a lista MVP (ADR-008 §1).
 *
 * - Drag-to-reschedule via FullCalendar interaction plugin
 * - Click event → modal de cancel (placeholder simples por enquanto)
 * - Re-fetch quando navega entre semanas (datesSet callback)
 */
export default function AdminAgendaPage() {
  useActiveTenant();
  const calendarRef = useRef<FullCalendar | null>(null);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [barberId, setBarberId] = useState<string>('');
  const [items, setItems] = useState<AdminAppointmentItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Range visível atual (controlled pelo FullCalendar via datesSet)
  const [visibleRange, setVisibleRange] = useState<{ from: string; to: string } | null>(
    null,
  );

  useEffect(() => {
    void api
      .get<EmployeeDto[]>('/employees?includeInactive=false')
      .then((data) => setEmployees(data.filter((e) => e.role !== 'admin')))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    if (!visibleRange) return;
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        from: visibleRange.from,
        to: visibleRange.to,
      });
      if (barberId) params.set('barberId', barberId);
      const data = await api.get<AdminAppointmentItem[]>(
        `/admin/appointments?${params.toString()}`,
      );
      setItems(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar agenda');
    }
  }, [visibleRange, barberId]);

  useEffect(() => {
    void load();
  }, [load]);

  // FullCalendar invoca quando navega ou troca view
  const handleDatesSet = (arg: DatesSetArg) => {
    const from = formatYMD(arg.start);
    // end é exclusivo no FullCalendar; backend `to` é inclusivo → subtrai 1 dia
    const endDate = new Date(arg.end.getTime() - 24 * 60 * 60 * 1000);
    const to = formatYMD(endDate);
    setVisibleRange((prev) => (prev?.from === from && prev?.to === to ? prev : { from, to }));
  };

  const events = useMemo(
    () =>
      items.map((a) => ({
        id: a.id,
        title: `${a.customerName} — ${a.service.name}`,
        start: a.startAt,
        end: a.endAt,
        backgroundColor: a.status === 'cancelled' ? '#A1A1AA' : '#357BE4',
        borderColor: a.status === 'cancelled' ? '#A1A1AA' : '#357BE4',
        extendedProps: {
          appt: a,
        },
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
    const confirmed = window.confirm(
      `Remarcar agendamento de ${appt.customerName} para ${newStartLabel}?`,
    );
    if (!confirmed) {
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
    if (appt.status !== 'booked') return; // cancelados/concluídos não acionam
    const label = new Date(appt.startAt).toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const confirmed = window.confirm(
      `Cancelar agendamento de ${appt.customerName} em ${label}?`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await api.patch(`/admin/appointments/${appt.id}/cancel`);
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erro ao cancelar');
    } finally {
      setBusy(false);
    }
  }

  function handleDateSelect(_arg: DateSelectArg) {
    // Hook pra Phase 4 (novo agendamento). Por enquanto no-op.
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Arraste eventos pra remarcar. Clique pra cancelar.
        </p>
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
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
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
          <Button variant="outline" onClick={() => void load()} disabled={busy}>
            Atualizar
          </Button>
        </CardContent>
      </Card>

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

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

