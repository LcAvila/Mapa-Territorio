import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface RotasContextData {
  // Novo sistema de ciclos
  currentCycle: RouteCycle | null;
  setCurrentCycle: (cycle: RouteCycle | null) => void;
  currentWeeks: RouteCycleWeek[];
  setCurrentWeeks: (weeks: RouteCycleWeek[]) => void;
  currentSequence: RouteSequence | null;
  setCurrentSequence: (sequence: RouteSequence | null) => void;
  
  // Legado e utilitários
  planilhaData: Record<string, unknown>[];
  setPlanilhaData: (data: Record<string, unknown>[]) => void;
  planilhaSummary: { totalRows: number; columns: string[] } | null;
  setPlanilhaSummary: (summary: { totalRows: number; columns: string[] } | null) => void;
  selectedUserId: number | null;
  setSelectedUserId: (id: number | null) => void;
  selectedClients: Cliente[];
  setSelectedClients: (clients: Cliente[]) => void;
  routeResults: RouteResultEntry[];
  addRouteResult: (entry: RouteResultEntry) => void;
  clearRouteResults: () => void;
}

const RotasContext = createContext<RotasContextData | undefined>(undefined);

export function RotasProvider({ children }: { children: React.ReactNode }) {
  const [currentCycle, setCurrentCycle] = useState<RouteCycle | null>(null);
  const [currentWeeks, setCurrentWeeks] = useState<RouteCycleWeek[]>([]);
  const [currentSequence, setCurrentSequence] = useState<RouteSequence | null>(null);

  const [planilhaData, setPlanilhaData] = useState<Record<string, unknown>[]>([]);
  const [planilhaSummary, setPlanilhaSummary] = useState<{ totalRows: number; columns: string[] } | null>(null);
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedClients, setSelectedClients] = useState<Cliente[]>([]);
  const [routeResults, setRouteResults] = useState<RouteResultEntry[]>([]);

  const addRouteResult = (entry: RouteResultEntry) => {
    setRouteResults(prev => {
      const filtered = prev.filter(r => !(r.userId === entry.userId && r.semana === entry.semana));
      return [...filtered, entry];
    });
  };

  const clearRouteResults = () => setRouteResults([]);

  return (
    <RotasContext.Provider value={{
      currentCycle, setCurrentCycle,
      currentWeeks, setCurrentWeeks,
      currentSequence, setCurrentSequence,
      planilhaData, setPlanilhaData,
      planilhaSummary, setPlanilhaSummary,
      selectedUserId, setSelectedUserId,
      selectedClients, setSelectedClients,
      routeResults, addRouteResult, clearRouteResults,
    }}>
      {children}
    </RotasContext.Provider>
  );
}

const useRotas = () => {
  const context = useContext(RotasContext);
  if (context === undefined) {
    throw new Error('useRotas must be used within a RotasProvider');
  }
  return context;
};

export { useRotas };
