import React, { createContext, useContext, useState } from 'react';

interface RotasContextData {
  planilhaData: Record<string, unknown>[];
  setPlanilhaData: (data: Record<string, unknown>[]) => void;
  planilhaSummary: { totalRows: number; columns: string[] } | null;
  setPlanilhaSummary: (summary: { totalRows: number; columns: string[] } | null) => void;
}

const RotasContext = createContext<RotasContextData | undefined>(undefined);

export function RotasProvider({ children }: { children: React.ReactNode }) {
  const [planilhaData, setPlanilhaData] = useState<Record<string, unknown>[]>([]);
  const [planilhaSummary, setPlanilhaSummary] = useState<{ totalRows: number; columns: string[] } | null>(null);

  return (
    <RotasContext.Provider value={{
      planilhaData, setPlanilhaData,
      planilhaSummary, setPlanilhaSummary
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
