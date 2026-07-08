'use client';

import type { UnitDto, UnitsResponse } from '@barbearia/schemas';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { api } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';

interface ActiveUnitContextValue {
  units: UnitDto[];
  activeUnit: UnitDto;
  setActiveUnitId: (id: string) => void;
  /** Teto de unidades do plano (PLAN_LIMITS[tier].maxUnits). */
  limit: number;
  tier: string;
  refresh: () => Promise<void>;
}

const ActiveUnitContext = createContext<ActiveUnitContextValue | null>(null);

export function useActiveUnit(): ActiveUnitContextValue {
  const ctx = useContext(ActiveUnitContext);
  if (!ctx) {
    throw new Error('useActiveUnit() must be used inside <ActiveUnitProvider>');
  }
  return ctx;
}

const STORAGE_KEY = 'navalha.activeUnitId';

/**
 * Resolve a unidade (barbershop) ativa do admin. Persistida em localStorage;
 * inválida/desativada cai pra 1ª unidade ativa. Depende do ActiveTenantProvider.
 */
export function ActiveUnitProvider({ children }: { children: ReactNode }) {
  const { tenant } = useActiveTenant();
  const [data, setData] = useState<UnitsResponse | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await api.get<UnitsResponse>('/admin/units', { tenantId: tenant.id });
      setData(r);
      const stored = localStorage.getItem(STORAGE_KEY);
      const valid = r.units.find((u) => u.id === stored && u.isActive);
      setActiveId(valid?.id ?? r.units.find((u) => u.isActive)?.id ?? r.units[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar unidades');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!data || !activeId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  const activeUnit = data.units.find((u) => u.id === activeId) ?? data.units[0]!;

  function setActiveUnitId(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveId(id);
  }

  return (
    <ActiveUnitContext.Provider
      value={{
        units: data.units,
        activeUnit,
        setActiveUnitId,
        limit: data.limit,
        tier: data.tier,
        refresh: load,
      }}
    >
      {children}
    </ActiveUnitContext.Provider>
  );
}
