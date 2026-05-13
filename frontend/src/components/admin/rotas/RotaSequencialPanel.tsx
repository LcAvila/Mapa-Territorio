/**
 * RotaSequencialPanel.tsx
 *
 * Replica e supera a aba "Roteiro Sequencial" da planilha Excel.
 * Usa a HERE Routing API v8 para calcular a sequência real de visitas
 * por semana para um representante, considerando distâncias reais via rodoviária.
 */
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Route, Loader2, Play, ChevronDown, MapPin, Clock, Navigation2, CheckCircle2, AlertCircle, RotateCcw, Info, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRotas } from '@/contexts/RotasContext';
import { useApiUsers } from '@/hooks/use-api-data';
import { routePlanningService } from '@/services/route-planning';
import { toast } from 'sonner';
import { RouteSequence, RouteSequenceItem } from '@/types/routes';

const SEMANAS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];

export function RotaSequencialPanel() {
  const { currentCycle, currentSequence, setCurrentSequence } = useRotas();
  const { data: users = [] } = useApiUsers(true);
  
  const [selectedSemana, setSelectedSemana] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sequenceItems, setSequenceItems] = useState<RouteSequenceItem[]>([]);

  // Carregar sequência se existir
  useEffect(() => {
    if (currentCycle && selectedSemana) {
      // Aqui poderíamos buscar a sequência do banco
      // fetchSequence(currentCycle.id, selectedSemana);
    }
  }, [currentCycle, selectedSemana]);

  const handleGenerateInitial = async () => {
    if (!currentCycle) return;
    
    setLoading(true);
    try {
      const week = 1; // Simplificado para exemplo
      const seq = await routePlanningService.generateSequence({
        cycleId: currentCycle.id,
        weekId: week, // Precisamos do ID real da semana
        supervisorId: currentCycle.supervisor_user_id
      });
      setCurrentSequence(seq);
      toast.success('Roteiro inicial gerado com sucesso!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!currentSequence) return;
    
    setLoading(true);
    try {
      await routePlanningService.optimizeRoute(currentSequence.id);
      toast.success('Roteiro reotimizado via HERE API!');
      // Recarregar dados...
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            Roteiro Sequencial
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sequência de visitas otimizada por semana usando HERE API.
          </p>
        </div>
      </div>

      {!currentCycle ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-20 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Crie ou selecione um Ciclo de Planejamento para gerenciar roteiros.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Semana</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setSelectedSemana(num)}
                    className={`px-4 h-10 text-xs font-bold rounded-md border transition-all ${
                      selectedSemana === num
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    S{num}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              {!currentSequence ? (
                <Button onClick={handleGenerateInitial} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Gerar Roteiro Inicial
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleOptimize} disabled={loading} className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Reotimizar HERE API
                  </Button>
                  <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Save className="w-4 h-4" /> Publicar Roteiro
                  </Button>
                </>
              )}
            </div>
          </div>

          {currentSequence ? (
            <div className="space-y-4">
               {/* KPIs e Lista de Itens seriam renderizados aqui baseados no currentSequence */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card className="p-4 border-border/40">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Distância Total</p>
                    <p className="text-xl font-black text-primary">{currentSequence.total_distance_km?.toFixed(1) || '0'} km</p>
                  </Card>
                  <Card className="p-4 border-border/40">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Duração Est.</p>
                    <p className="text-xl font-black text-primary">{currentSequence.total_duration_minutes || '0'} min</p>
                  </Card>
                  <Card className="p-4 border-border/40">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Visitas</p>
                    <p className="text-xl font-black text-primary">{currentSequence.total_visits || '0'}</p>
                  </Card>
                  <Card className="p-4 border-border/40">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                    <p className="text-sm font-bold text-emerald-500 uppercase">{currentSequence.optimization_status}</p>
                  </Card>
               </div>

               <Card className="border-border/40 overflow-hidden">
                 <CardContent className="p-0">
                    <div className="py-20 text-center text-muted-foreground">
                      <p className="text-sm">Selecione "Reotimizar" para calcular a sequência via HERE API.</p>
                    </div>
                 </CardContent>
               </Card>
            </div>
          ) : (
            <Card className="border-border/40">
              <CardContent className="py-20 text-center text-muted-foreground">
                <p className="text-sm">Clique em "Gerar Roteiro Inicial" para começar o planejamento desta semana.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

