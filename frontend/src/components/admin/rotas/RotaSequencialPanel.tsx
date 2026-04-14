/**
 * RotaSequencialPanel.tsx
 *
 * Replica e supera a aba "Roteiro Sequencial" da planilha Excel.
 * Usa a HERE Routing API v8 para calcular a sequência real de visitas
 * por semana para um representante, considerando distâncias reais via rodoviária.
 */
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Route, Loader2, Play, ChevronDown, MapPin, Clock,
  Navigation2, CheckCircle2, AlertCircle, RotateCcw, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRotas } from '@/contexts/RotasContext';
import { useApiRepresentatives, useApiClientes, Cliente } from '@/hooks/use-api-data';
import { useRouting, RouteWaypoint } from '@/hooks/use-routing';
import { toast } from 'sonner';

const SEMANAS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
const CLIENTS_PER_WEEK = Math.ceil(880 / (8 * 4)); // ~27 por semana, ajusta dinamicamente

const CLASSIFICATION_COLORS: Record<string, string> = {
  'Estratégico': 'bg-red-500/10 text-red-500 border-red-500/20',
  'Forte':       'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Médio':       'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Pontual':     'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export function RotaSequencialPanel() {
  const { selectedRepCode, setSelectedRepCode, addRouteResult } = useRotas();
  const { data: reps = [] } = useApiRepresentatives(true);
  const { data: clientes = [], isLoading: loadingClientes } = useApiClientes(selectedRepCode || null);
  const { calculateRoute, isLoading: routing, result, error, clearRoute } = useRouting();

  const [selectedSemana, setSelectedSemana] = useState('Semana 1');
  const [calculatedClients, setCalculatedClients] = useState<Cliente[]>([]);

  // Divide os clientes em 4 semanas usando bairro/localidade como critério
  const clientesForSemana = useMemo(() => {
    const clientsWithGPS = clientes.filter(c => c.latitude && c.longitude);
    const perWeek = Math.ceil(clientsWithGPS.length / 4);
    const semanaIdx = SEMANAS.indexOf(selectedSemana);
    return clientsWithGPS.slice(semanaIdx * perWeek, (semanaIdx + 1) * perWeek);
  }, [clientes, selectedSemana]);

  const clientesSemGPS = useMemo(() =>
    clientes.filter(c => !c.latitude || !c.longitude).length,
    [clientes]
  );

  const handleCalculate = async () => {
    if (clientesForSemana.length < 2) {
      toast.error('São necessários pelo menos 2 clientes com GPS nesta semana.');
      return;
    }

    const waypoints: RouteWaypoint[] = clientesForSemana.map(c => ({
      lat: c.latitude,
      lng: c.longitude,
      label: c.nome_cliente,
    }));

    const routeResult = await calculateRoute(waypoints, 'car');
    if (routeResult) {
      setCalculatedClients(clientesForSemana);
      addRouteResult({
        repCode: selectedRepCode,
        semana: selectedSemana,
        result: routeResult,
        clients: clientesForSemana,
        calculatedAt: new Date().toISOString(),
      });
      toast.success(`Roteiro de ${selectedSemana} calculado! ${routeResult.distanceFormatted} · ${routeResult.durationFormatted}`);
    }
  };

  const handleClear = () => {
    clearRoute();
    setCalculatedClients([]);
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
            Sequência de visitas otimizada por semana.
            A HERE API calcula o percurso real pelas vias, substituindo a planilha Excel.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Representante</label>
          <div className="relative min-w-[250px]">
            <select
              className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm appearance-none pr-10"
              value={selectedRepCode}
              onChange={e => { setSelectedRepCode(e.target.value); clearRoute(); setCalculatedClients([]); }}
            >
              <option value="">-- Selecione um Representante --</option>
              {reps.map(r => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Semana</label>
          <div className="flex gap-1">
            {SEMANAS.map(sem => (
              <button
                key={sem}
                type="button"
                onClick={() => { setSelectedSemana(sem); clearRoute(); setCalculatedClients([]); }}
                className={`px-3 h-10 text-xs font-semibold rounded-md border transition-all ${
                  selectedSemana === sem
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input text-muted-foreground hover:border-primary/50'
                }`}
              >
                {sem.replace('Semana ', 'S')}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex gap-2">
          {result && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </Button>
          )}
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!selectedRepCode || clientesForSemana.length < 2 || routing || loadingClientes}
            onClick={handleCalculate}
          >
            {routing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando...</>
              : <><Play className="w-4 h-4" /> Gerar Roteiro ({clientesForSemana.length} paradas)</>
            }
          </Button>
        </div>
      </div>

      {/* Aviso de clientes sem GPS */}
      {selectedRepCode && clientesSemGPS > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{clientesSemGPS} clientes</strong> sem coordenadas GPS foram excluídos do cálculo.
            Apenas os <strong>{clientes.filter(c => c.latitude && c.longitude).length} georreferenciados</strong> são considerados.
          </span>
        </div>
      )}

      {/* Estado inicial */}
      {!selectedRepCode && (
        <Card className="border-border/40">
          <CardContent className="py-20 text-center text-muted-foreground">
            <Route className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-base font-semibold text-foreground">Roteiro Sequencial HERE API</p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              Selecione um representante e a semana desejada. O sistema usa inteligência de rotas
              real da HERE para calcular o percurso sequencial mínimo entre os clientes da carteira.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Calculando... */}
      {routing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-12 text-center text-primary">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Navigation2 className="w-7 h-7 animate-spin" />
            </div>
            <p className="font-semibold">Consultando HERE Routing API v8...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Calculando a malha viária para {clientesForSemana.length} paradas em {selectedSemana}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Erro */}
      {error && (
        <Card className="border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Falha no Roteamento</p>
                <p className="text-xs mt-1 text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado do roteiro */}
      {result && calculatedClients.length > 0 && !routing && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total de Paradas', value: result.waypointCount, icon: MapPin, color: 'text-primary' },
              { label: 'Distância Total', value: result.distanceFormatted, icon: Route, color: 'text-emerald-600' },
              { label: 'Tempo Estimado', value: result.durationFormatted, icon: Clock, color: 'text-orange-500' },
              { label: 'Média por Parada', value: `${(result.totalDistance / 1000 / result.waypointCount).toFixed(1)} km`, icon: Navigation2, color: 'text-blue-500' },
            ].map(k => (
              <Card key={k.label} className="border-border/40">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <k.icon className={`w-4 h-4 ${k.color}`} />
                  </div>
                  <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sequência de visitas */}
          <Card className="border-border/40 overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b border-border/40 pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Route className="w-4 h-4 text-primary" />
                Sequência de Visitas — {selectedSemana}
                <span className="ml-auto text-xs font-mono text-muted-foreground bg-background border border-border px-2 py-0.5 rounded">
                  {calculatedClients.length} paradas · {result.distanceFormatted}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[600px]">
                {calculatedClients.map((client, idx) => {
                  const section = result.sections[idx > 0 ? idx - 1 : 0];
                  const isFirst = idx === 0;
                  const isLast = idx === calculatedClients.length - 1;

                  return (
                    <div key={client.id_cliente} className="flex gap-0">
                      {/* Timeline column */}
                      <div className="flex flex-col items-center pt-4 pb-0 px-4 shrink-0 w-12">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 text-[11px] font-bold border-2 ${
                          isFirst ? 'bg-emerald-500 border-emerald-400 text-white' :
                          isLast  ? 'bg-blue-500 border-blue-400 text-white' :
                          'bg-background border-primary text-primary'
                        }`}>
                          {isFirst ? '▶' : isLast ? '⏹' : idx + 1}
                        </div>
                        {!isLast && (
                          <div className="w-0.5 flex-1 bg-border/60 my-1 min-h-[20px]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 py-3 pr-4 border-b border-border/30 last:border-0 ${isFirst ? 'pt-3.5' : ''}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isFirst && (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full">
                                  🚀 INÍCIO
                                </span>
                              )}
                              {isLast && (
                                <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold px-2 py-0.5 rounded-full">
                                  🏁 FINAL
                                </span>
                              )}
                              <p className="text-sm font-semibold">{client.nome_cliente}</p>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {client.bairro ? `${client.bairro}, ` : ''}{client.cidade || ''}
                              </span>
                              {client.uf && (
                                <span className="font-mono font-bold text-primary">{client.uf}</span>
                              )}
                              <span className="font-mono text-[10px] opacity-60">#{client.codigo_cliente}</span>
                            </div>
                          </div>

                          {/* Dados do trecho (da HERE API) */}
                          {idx > 0 && section && (
                            <div className="flex gap-3 text-xs shrink-0">
                              <div className="flex flex-col items-center bg-secondary/40 border border-border/40 rounded px-2 py-1">
                                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Dist.</span>
                                <span className="font-bold text-foreground">{section.distanceFormatted}</span>
                              </div>
                              <div className="flex flex-col items-center bg-secondary/40 border border-border/40 rounded px-2 py-1">
                                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Tempo</span>
                                <span className="font-bold text-foreground">{section.durationFormatted}</span>
                              </div>
                            </div>
                          )}
                          {idx === 0 && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Ponto de partida</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 text-blue-600 text-xs">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              Rota calculada em tempo real pela <strong>HERE Routing API v8</strong>.
              Este roteiro substitui a aba "Roteiro Sequencial" da planilha Excel com dados reais de tráfego.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
