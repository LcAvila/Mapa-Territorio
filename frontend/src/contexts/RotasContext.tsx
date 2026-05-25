import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Cliente } from '@/hooks/use-api-data';
import { RouteResult } from '@/hooks/use-routing';
import { RouteCycle, RouteCycleWeek, RouteSequence } from '@/types/routes';

interface RouteResultEntry {
  userId: number;
  semana: string;
  result: RouteResult;
  clients: Cliente[];
  calculatedAt: string;
}

// ─── Cycle Context (lightweight, few consumers) ─────────────────────────────
interface CycleContextData {
  currentCycle: RouteCycle | null;
  setCurrentCycle: (cycle: RouteCycle | null) => void;
  currentWeeks: RouteCycleWeek[];
  setCurrentWeeks: (weeks: RouteCycleWeek[]) => void;
  currentSequence: RouteSequence | null;
  setCurrentSequence: (sequence: RouteSequence | null) => void;
}

const CycleContext = createContext<CycleContextData | undefined>(undefined);

// ─── Planilha/Data Context (heavy data, isolated re-renders) ────────────────
interface PlanilhaContextData {
  planilhaData: Record<string, unknown>[];
  setPlanilhaData: (data: Record<string, unknown>[]) => void;
  planilhaSummary: { totalRows: number; columns: string[] } | null;
  setPlanilhaSummary: (summary: { totalRows: number; columns: string[] } | null) => void;
}

const PlanilhaContext = createContext<PlanilhaContextData | undefined>(undefined);

// ─── Selection & Results Context ────────────────────────────────────────────
interface SelectionContextData {
  selectedUserId: number | null;
  setSelectedUserId: (id: number | null) => void;
  selectedClients: Cliente[];
  setSelectedClients: (clients: Cliente[]) => void;
  routeResults: RouteResultEntry[];
  addRouteResult: (entry: RouteResultEntry) => void;
  clearRouteResults: () => void;
}

const SelectionContext = createContext<SelectionContextData | undefined>(undefined);

// ─── Combined Provider ──────────────────────────────────────────────────────
export function RotasProvider({ children }: { children: React.ReactNode }) {
  // Cycle state
  const [currentCycle, setCurrentCycle] = useState<RouteCycle | null>(null);
  const [currentWeeks, setCurrentWeeks] = useState<RouteCycleWeek[]>([]);
  const [currentSequence, setCurrentSequence] = useState<RouteSequence | null>(null);

  // Planilha state (large data, isolated)
  const [planilhaData, setPlanilhaData] = useState<Record<string, unknown>[]>([]);
  const [planilhaSummary, setPlanilhaSummary] = useState<{ totalRows: number; columns: string[] } | null>(null);

  // Selection state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedClients, setSelectedClients] = useState<Cliente[]>([]);
  const [routeResults, setRouteResults] = useState<RouteResultEntry[]>([]);

  const addRouteResult = useCallback((entry: RouteResultEntry) => {
    setRouteResults(prev => {
      const filtered = prev.filter(r => !(r.userId === entry.userId && r.semana === entry.semana));
      return [...filtered, entry];
    });
  }, []);

  const clearRouteResults = useCallback(() => setRouteResults([]), []);

  const cycleValue = useMemo(() => ({
    currentCycle, setCurrentCycle,
    currentWeeks, setCurrentWeeks,
    currentSequence, setCurrentSequence,
  }), [currentCycle, currentWeeks, currentSequence]);

  const planilhaValue = useMemo(() => ({
    planilhaData, setPlanilhaData,
    planilhaSummary, setPlanilhaSummary,
  }), [planilhaData, planilhaSummary]);

  const selectionValue = useMemo(() => ({
    selectedUserId, setSelectedUserId,
    selectedClients, setSelectedClients,
    routeResults, addRouteResult, clearRouteResults,
  }), [selectedUserId, selectedClients, routeResults, addRouteResult, clearRouteResults]);

  return (
    <CycleContext.Provider value={cycleValue}>
      <PlanilhaContext.Provider value={planilhaValue}>
        <SelectionContext.Provider value={selectionValue}>
          {children}
        </SelectionContext.Provider>
      </PlanilhaContext.Provider>
    </CycleContext.Provider>
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Use only cycle state - won't re-render on planilha/selection changes */
export function useRotasCycle() {
  const context = useContext(CycleContext);
  if (!context) throw new Error('useRotasCycle must be used within a RotasProvider');
  return context;
}

/** Use only planilha data - won't re-render on cycle/selection changes */
export function useRotasPlanilha() {
  const context = useContext(PlanilhaContext);
  if (!context) throw new Error('useRotasPlanilha must be used within a RotasProvider');
  return context;
}

/** Use selection and route results */
export function useRotasSelection() {
  const context = useContext(SelectionContext);
  if (!context) throw new Error('useRotasSelection must be used within a RotasProvider');
  return context;
}

/** Combined hook for backward compatibility (use specific hooks when possible) */
export function useRotas() {
  const cycle = useRotasCycle();
  const planilha = useRotasPlanilha();
  const selection = useRotasSelection();
  return { ...cycle, ...planilha, ...selection };
}
