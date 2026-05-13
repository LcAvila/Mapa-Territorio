import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Map, Truck, Play, Loader2, Navigation2, CheckCircle2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRotas } from '@/contexts/RotasContext';
import { useApiRepresentatives, useApiClientes, Cliente } from '@/hooks/use-api-data';
import { useRouting, TransportMode, RouteWaypoint } from '@/hooks/use-routing';
import { toast } from 'sonner';

export function RoteirosPanel() {
  const { selectedUserId, setSelectedUserId } = useRotas();
  
  const { data: reps = [], isLoading: loadingReps } = useApiRepresentatives(true);
  const { data: clientes = [], isLoading: loadingClientes } = useApiClientes(selectedUserId || null);
  
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const { calculateRoute, clientesToWaypoints, isLoading: routing, result, error } = useRouting();

  const handleSelectRep = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUserId(e.target.value ? Number(e.target.value) : null);
    setSelectedClientIds([]);
  };

  const toggleClient = (id: number) => {
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedClientIds.length === clientes.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clientes.map(c => c.id_cliente));
    }
  };

  const handleGenerateRoute = async () => {
    const clientsToRoute = clientes.filter(c => selectedClientIds.includes(c.id_cliente));
    
    if (clientsToRoute.length < 1) {
      toast.error('Selecione ao menos 1 cliente para roteirizar (além da origem).');
      return;
    }

    const clientsWithCoordinates = clientsToRoute.filter(c => c.latitude && c.longitude);
    if (clientsWithCoordinates.length < clientsToRoute.length) {
      toast.warning(`${clientsToRoute.length - clientsWithCoordinates.length} cliente(s) não possuem coordenadas válidas e serão ignorados.`);
    }

    if (clientsWithCoordinates.length === 0) {
      toast.error('Nenhum cliente selecionado possui coordenadas geográficas válidas.');
      return;
    }

    // Para teste, vamos usar a posição do primeiro cliente como origem, ou o centro do território,
    // ou simplesmente rotear entre todos eles em ordem.
    // Como a API v8 suporta N waypoints (origin, destination, vias), vamos converter.
    
    const waypoints: RouteWaypoint[] = clientsWithCoordinates.map(c => ({
      lat: c.latitude,
      lng: c.longitude,
      label: c.nome_cliente
    }));

    // Se tiver só 1, a API falha. Precisamos de pelo menos 2 pontos (origem + destino).
    if (waypoints.length < 2) {
      toast.error('É necessário ao menos 2 pontos válidos (clientes com coordenadas) para traçar rotas.');
      return;
    }

    const routeResult = await calculateRoute(waypoints, 'car');
    if (routeResult) {
      toast.success('Rota calculada com sucesso pela HERE API!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Planejamento de Roteiros (HERE API)</h2>
          <p className="text-sm text-muted-foreground">Otimização de percursos ponto a ponto integrando a inteligência da HERE Maps.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Usuário</span>
                {loadingReps && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative">
                <select
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm appearance-none pr-10"
                    value={selectedUserId || ''}
                    onChange={handleSelectRep}
                  >
                    <option value="">-- Selecione um Usuário --</option>
                    {reps.map(r => (
                      <option key={r.id} value={r.id}>{r.code ? `${r.code} — ` : ''}{r.full_name || r.fullName || r.username}</option>
                    ))}
                  </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              {selectedUserId && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <p className="text-xs text-muted-foreground mb-2">Selecione os clientes para a rota:</p>
                  
                  {loadingClientes ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                       <div className="flex items-center justify-between text-xs mb-1 bg-secondary/50 p-2 rounded">
                         <span className="font-semibold">{clientes.length} Cadastrados</span>
                         <button type="button" className="text-primary hover:underline" onClick={toggleAll}>
                           {selectedClientIds.length === clientes.length ? 'Desmarcar' : 'Selecionar Tudo'}
                         </button>
                       </div>
                       
                       <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                         {clientes.map(c => (
                           <label key={c.id_cliente} className={`flex flex-col gap-1 p-2 rounded border cursor-pointer transition-colors ${selectedClientIds.includes(c.id_cliente) ? 'bg-primary/5 border-primary/30' : 'bg-transparent border-transparent hover:bg-secondary/40'}`}>
                             <div className="flex items-start gap-2">
                               <input type="checkbox" className="mt-0.5 rounded text-primary border-muted-foreground/30" checked={selectedClientIds.includes(c.id_cliente)} onChange={() => toggleClient(c.id_cliente)} />
                               <div className="text-xs leading-tight">
                                  <span className="font-medium">{c.nome_cliente}</span>
                                  <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5">
                                    <span>#{c.codigo_cliente}</span>
                                    {c.bairro && <span>{c.bairro}</span>}
                                    {(!c.latitude || !c.longitude) && <span className="text-destructive font-semibold" title="Faltam coordenadas">⚠️ S/ GPS</span>}
                                  </div>
                               </div>
                             </div>
                           </label>
                         ))}
                       </div>
                    </div>
                  )}

                  <Button 
                    className="w-full mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" 
                    disabled={selectedClientIds.length < 2 || routing}
                    onClick={handleGenerateRoute}
                  >
                    {routing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Montar Rota ({selectedClientIds.length})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="border-border/40 h-full min-h-[400px] flex flex-col">
            <CardHeader className="border-b border-border/40 bg-secondary/10 pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                 <div className="flex items-center gap-2"><Map className="w-4 h-4 text-primary" /> Roteiro Calculado</div>
                 {result && (
                   <span className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                     {result.waypointCount} PARADAS • {result.distanceFormatted} • {result.durationFormatted}
                   </span>
                 )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {!result && !routing && !error && (
                 <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                    <Truck className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-base font-semibold text-foreground">Sistema de Roteamento Inteligente</p>
                    <p className="text-sm mt-1 max-w-sm mx-auto">Esta funcionalidade substitui a antiga planilha de Excel. Selecione os clientes e a inteligência da HERE cuidará do trajeto perfeito.</p>
                 </div>
              )}

              {routing && (
                 <div className="flex-1 flex flex-col items-center justify-center text-center text-primary p-6 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                      <Navigation2 className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Calculando a malha viária...</p>
                      <p className="text-xs text-muted-foreground mt-1">Acionando API v8 da HERE.</p>
                    </div>
                 </div>
              )}

              {error && (
                 <div className="p-6">
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                      <p className="font-semibold">Falha no Roteamento</p>
                      <p className="mt-1">{error}</p>
                    </div>
                 </div>
              )}

              {result && (
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  <div className="space-y-0.5">
                    {result.sections.map((section, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === result.sections.length - 1;
                      
                      return (
                        <div key={idx} className="flex gap-4">
                          <div className="flex flex-col items-center gap-1 min-w-[30px] pt-1">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border-2 border-background text-[10px] font-bold text-primary z-10 shrink-0">
                               {idx + 1}
                            </div>
                            {!isLast && <div className="w-0.5 h-10 bg-border/60 rounded my-0.5" />}
                          </div>
                          <div className="pb-4 flex-1">
                            <div className="bg-secondary/30 border border-border/50 rounded-lg p-3">
                               <p className="text-sm font-semibold mb-1">
                                 Trecho {idx + 1}
                               </p>
                               <div className="flex justify-between items-center mt-2">
                                 <div className="flex gap-4 text-xs text-muted-foreground">
                                   <div className="flex flex-col">
                                     <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Dur.</span>
                                     <span className="text-foreground font-medium">{section.durationFormatted}</span>
                                   </div>
                                   <div className="flex flex-col border-l border-border pl-4">
                                     <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Dist.</span>
                                     <span className="text-foreground font-medium">{section.distanceFormatted}</span>
                                   </div>
                                 </div>
                               </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
