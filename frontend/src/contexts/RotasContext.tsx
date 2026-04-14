import React, { createContext, useContext, useState } from 'react';
import { Cliente } from '@/hooks/use-api-data';
import { RouteResult } from '@/hooks/use-routing';

interface RouteResultEntry {
  repCode: string;
  semana: string;
  result: RouteResult;
  clients: Cliente[];
  calculatedAt: string;
}

interface RotasContextData {
  planilhaData: Record<string, unknown>[];
  setPlanilhaData: (data: Record<string, unknown>[]) => void;
  planilhaSummary: { totalRows: number; columns: string[] } | null;
  setPlanilhaSummary: (summary: { totalRows: number; columns: string[] } | null) => void;
  selectedRepCode: string;
  setSelectedRepCode: (code: string) => void;
  selectedClients: Cliente[];
  setSelectedClients: (clients: Cliente[]) => void;
  routeResults: RouteResultEntry[];
  addRouteResult: (entry: RouteResultEntry) => void;
  clearRouteResults: () => void;
}

const RotasContext = createContext<RotasContextData | undefined>(undefined);

export function RotasProvider({ children }: { children: React.ReactNode }) {
  const [planilhaData, setPlanilhaData] = useState<Record<string, unknown>[]>([]);
  const [planilhaSummary, setPlanilhaSummary] = useState<{ totalRows: number; columns: string[] } | null>(null);
  
  const [selectedRepCode, setSelectedRepCode] = useState<string>('');
  const [selectedClients, setSelectedClients] = useState<Cliente[]>([]);
  const [routeResults, setRouteResults] = useState<RouteResultEntry[]>([]);

  const addRouteResult = (entry: RouteResultEntry) => {
    setRouteResults(prev => {
      const filtered = prev.filter(r => !(r.repCode === entry.repCode && r.semana === entry.semana));
      return [...filtered, entry];
    });
  };

  const clearRouteResults = () => setRouteResults([]);

  return (
    <RotasContext.Provider value={{
      planilhaData, setPlanilhaData,
      planilhaSummary, setPlanilhaSummary,
      selectedRepCode, setSelectedRepCode,
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
