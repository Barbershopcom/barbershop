'use client';

import {
  type BarbershopHoursDto,
  type HourRange,
  type Weekday,
  weekdayLabels,
  weekdays,
} from '@barbearia/schemas';
import { Plus, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';

interface DayState {
  weekday: Weekday;
  ranges: { opensAt: string; closesAt: string }[];
}

function emptyWeek(): DayState[] {
  return weekdays.map((w) => ({ weekday: w, ranges: [] }));
}

function groupByDay(rows: BarbershopHoursDto[]): DayState[] {
  const map = new Map<Weekday, DayState>();
  for (const w of weekdays) map.set(w, { weekday: w, ranges: [] });
  for (const r of rows) {
    const slot = map.get(r.weekday);
    if (slot) slot.ranges.push({ opensAt: r.opensAt, closesAt: r.closesAt });
  }
  return Array.from(map.values()).map((d) => ({
    ...d,
    ranges: d.ranges.sort((a, b) => a.opensAt.localeCompare(b.opensAt)),
  }));
}

export default function HoursPage() {
  const { tenant } = useActiveTenant();
  const [week, setWeek] = useState<DayState[]>(emptyWeek());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    setLoadError(null);
    try {
      const rows = await api.get<BarbershopHoursDto[]>('/barbershop-hours', {
        tenantId: tenant.id,
      });
      setWeek(groupByDay(rows));
      setLoaded(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar horários');
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  function addRange(weekday: Weekday) {
    setWeek((prev) =>
      prev.map((d) =>
        d.weekday === weekday
          ? { ...d, ranges: [...d.ranges, { opensAt: '09:00', closesAt: '18:00' }] }
          : d,
      ),
    );
  }

  function removeRange(weekday: Weekday, idx: number) {
    setWeek((prev) =>
      prev.map((d) =>
        d.weekday === weekday
          ? { ...d, ranges: d.ranges.filter((_, i) => i !== idx) }
          : d,
      ),
    );
  }

  function updateRange(weekday: Weekday, idx: number, field: 'opensAt' | 'closesAt', value: string) {
    setWeek((prev) =>
      prev.map((d) =>
        d.weekday === weekday
          ? {
              ...d,
              ranges: d.ranges.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
            }
          : d,
      ),
    );
  }

  async function save() {
    setSaveError(null);
    setSaving(true);
    try {
      const ranges: HourRange[] = week.flatMap((d) =>
        d.ranges.map((r) => ({
          weekday: d.weekday,
          opensAt: r.opensAt,
          closesAt: r.closesAt,
        })),
      );
      // Valida no front: fechamento > abertura
      for (const r of ranges) {
        if (r.closesAt <= r.opensAt) {
          throw new Error(
            `${weekdayLabels[r.weekday as Weekday]}: fechamento (${r.closesAt}) deve ser depois da abertura (${r.opensAt}).`,
          );
        }
      }
      await api.put('/barbershop-hours', { ranges }, { tenantId: tenant.id });
      await refresh();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Horários da barbearia</h1>
        <p className="text-sm text-muted-foreground">
          Janelas de funcionamento por dia. Adicione múltiplas (ex: manhã e tarde).
          Barbeiros podem ter horários próprios dentro dessas janelas (Sprint 2+).
        </p>
      </div>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Semana</CardTitle>
          <CardDescription>
            Dias sem janelas = barbearia fechada nesse dia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loaded ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            week.map((day) => (
              <div
                key={day.weekday}
                className="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start"
              >
                <div className="w-28 pt-2 text-sm font-medium">
                  {weekdayLabels[day.weekday]}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {day.ranges.length === 0 ? (
                    <span className="pt-2 text-sm italic text-muted-foreground">Fechado</span>
                  ) : (
                    day.ranges.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={r.opensAt}
                          onChange={(e) => updateRange(day.weekday, idx, 'opensAt', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">até</span>
                        <Input
                          type="time"
                          value={r.closesAt}
                          onChange={(e) => updateRange(day.weekday, idx, 'closesAt', e.target.value)}
                          className="w-32"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeRange(day.weekday, idx)}
                          aria-label="Remover faixa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addRange(day.weekday)}
                    className="w-fit"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar faixa
                  </Button>
                </div>
              </div>
            ))
          )}
          {saveError ? (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={save} disabled={saving || !loaded}>
            {saving ? 'Salvando…' : 'Salvar horários'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
