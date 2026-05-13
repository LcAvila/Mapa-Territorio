import React from 'react';
import { CycleManager } from './CycleManager';
import { RotaSequencialPanel } from './RotaSequencialPanel';
import { AgendaPanel } from './AgendaPanel';
import { ResumoRoteiroPanel } from './ResumoRoteiroPanel';
import { ClustersPanel } from './ClustersPanel';
import { BlocosPanel } from './BlocosPanel';
import { RoteirosPanel } from './RoteirosPanel';
import { DensidadePanel } from './DensidadePanel';

interface PlanningDashboardProps {
  activeTab: string;
  onSwitchToReps?: () => void;
  canCreateClients?: boolean;
  isMobileFilterOpen?: boolean;
  clientesData?: any[];
  loadingClientes?: boolean;
  onRefreshClientes?: () => Promise<void>;
}

export function PlanningDashboard({ 
  activeTab
}: PlanningDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-primary">Planejamento de Áreas</h1>
        <p className="text-muted-foreground text-sm">Gerencie ciclos de visitas, otimize rotas e acompanhe a execução comercial.</p>
      </div>

      <div className="mt-4">
        {activeTab === 'cycles' && <CycleManager />}
        {activeTab === 'roteiro_seq' && <RotaSequencialPanel />}
        {activeTab === 'resumo_roteiro' && <ResumoRoteiroPanel />}
        {activeTab === 'agenda' && <AgendaPanel />}
        {activeTab === 'clusters' && <ClustersPanel />}
        {activeTab === 'blocos' && <BlocosPanel />}
        {activeTab === 'roteiros' && <RoteirosPanel />}
        {activeTab === 'densidade' && <DensidadePanel />}
      </div>
    </div>
  );
}
