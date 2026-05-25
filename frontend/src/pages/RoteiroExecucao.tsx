import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VisitStopCard, VisitStop } from '@/components/visit-route/VisitStopCard';
import { Loader2, ArrowLeft, Map as MapIcon, Play, CheckCircle2, Navigation } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-base';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context-core';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

export const RoteiroExecucao: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [stops, setStops] = useState<VisitStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStopId, setActiveStopId] = useState<number | null>(null);
  const [routeStarted, setRouteStarted] = useState(false);

  // Result Modal State
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);
  const [resultData, setResultData] = useState({
    status: 'visitada' as any,
    sale_made: false,
    sale_value: '',
    notes: ''
  });
  const [savingResult, setSavingResult] = useState(false);

  useEffect(() => {
    if (token) {
      fetchRouteDetails();
    }
  }, [id, token]);

  const fetchRouteDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/visit-route/sequence/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Sessão expirada. Faça login novamente.');
          logout();
        } else {
          toast.error(data.message || 'Erro ao carregar roteiro.');
        }
        return;
      }

      // Transformando dados do backend para o formato do componente
      const formattedStops: VisitStop[] = (data.items || []).map((item: any) => ({
        id: item.id,
        sequence_number: item.sequence_number,
        client_name: item.clientSnapshot.client_name,
        address: item.clientSnapshot.address,
        city: item.clientSnapshot.city,
        status: item.status,
        classification: item.classification,
        distance_from_previous_km: item.distance_from_previous_km,
        duration_from_previous_minutes: item.duration_from_previous_minutes,
        checkin_id: item.checkins?.[0]?.id,
        is_checked_in: !!item.checkins?.[0] && !item.checkins?.[0]?.checkout_at
      }));

      setStops(formattedStops);
      setRouteStarted(data.optimization_status === 'em_execucao');
      
      // Encontrar a parada ativa (em_rota ou visitando)
      const current = formattedStops.find(s => s.status === 'em_rota' || s.status === 'visitando');
      if (current) setActiveStopId(current.id);

    } catch (error) {
      console.error('Erro ao buscar detalhes do roteiro:', error);
      toast.error('Não foi possível carregar o roteiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoute = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/visit-route/${id}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setRouteStarted(true);
        toast.success('Roteiro iniciado! Boa sorte nas visitas.');
        fetchRouteDetails();
      } else if (response.status === 401) {
        logout();
      }
    } catch (error) {
      toast.error('Erro ao iniciar roteiro.');
    }
  };

  const handleCheckin = async (stopId: number) => {
    if (!navigator.geolocation) {
      return toast.error('Geolocalização não suportada pelo seu navegador.');
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/visit-route/checkin`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            route_sequence_item_id: stopId,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        });

        if (response.ok) {
          toast.success('Check-in realizado com sucesso!');
          fetchRouteDetails();
        } else if (response.status === 401) {
          logout();
        }
      } catch (error) {
        toast.error('Erro ao realizar check-in.');
      }
    });
  };

  const handleRegisterResult = (stopId: number) => {
    setSelectedStopId(stopId);
    setIsResultModalOpen(true);
  };

  const submitResult = async () => {
    if (!selectedStopId) return;

    try {
      setSavingResult(true);
      
      const stop = stops.find(s => s.id === selectedStopId);

      // 1. Checkout se houver check-in ativo
      if (stop?.checkin_id && stop.is_checked_in) {
        if (navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition>((resolve) => {
            navigator.geolocation.getCurrentPosition(resolve, () => resolve({ coords: { latitude: 0, longitude: 0 } } as any));
          });
          
          await fetch(`${API_BASE_URL}/api/visit-route/checkout`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
              checkin_id: stop.checkin_id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            })
          });
        }
      }

      // 2. Registrar resultado final
      const response = await fetch(`${API_BASE_URL}/api/visit-route/result`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          route_sequence_item_id: selectedStopId,
          status: resultData.status,
          sale_made: resultData.sale_made,
          sale_value: resultData.sale_value ? Number(resultData.sale_value) : undefined,
          notes: resultData.notes
        })
      });

      if (response.ok) {
        toast.success('Resultado registrado com sucesso!');
        setIsResultModalOpen(false);
        setResultData({ status: 'visitada', sale_made: false, sale_value: '', notes: '' });
        fetchRouteDetails();
      } else {
        if (response.status === 401) logout();
        toast.error('Erro ao salvar resultado.');
      }
    } catch (error) {
      toast.error('Erro de conexão ao salvar resultado.');
    } finally {
      setSavingResult(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Carregando Roteiro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Fixo */}
      <header className="h-16 border-b border-border/40 bg-background/95 backdrop-blur-sm flex items-center px-4 sticky top-0 z-50 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black uppercase tracking-tighter text-sm truncate">Roteiro do Dia</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            {stops.length} Paradas • {stops.filter(s => s.status === 'visitada').length} Concluídas
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-2 font-bold text-[10px] uppercase">
          <MapIcon className="w-4 h-4" /> Ver Mapa
        </Button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        {!routeStarted ? (
          <Card className="bg-primary/5 border-primary/20 border-dashed">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                <Navigation className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-black uppercase tracking-tight">Pronto para começar?</h2>
                <p className="text-sm text-muted-foreground">Inicie o roteiro para habilitar os check-ins e o GPS.</p>
              </div>
              <Button onClick={handleStartRoute} size="lg" className="w-full gap-2 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                <Play className="w-5 h-5" /> Iniciar Roteiro
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Próximas Visitas</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 animate-pulse">
                Em Execução
              </Badge>
            </div>
            {stops.map((stop) => (
              <VisitStopCard
                key={stop.id}
                stop={stop}
                isActive={stop.id === activeStopId}
                onCheckin={handleCheckin}
                onViewDetails={handleRegisterResult}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer com Progresso */}
      <footer className="p-4 bg-card border-t border-border/40 sticky bottom-0 z-50">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
            <span>Progresso Geral</span>
            <span>{Math.round((stops.filter(s => s.status === 'visitada').length / stops.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000" 
              style={{ width: `${(stops.filter(s => s.status === 'visitada').length / stops.length) * 100}%` }}
            />
          </div>
        </div>
      </footer>

      {/* Modal de Resultado */}
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">Registrar Resultado</DialogTitle>
            <DialogDescription className="text-xs">
              Informe o que aconteceu nesta visita para finalizá-la.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Status Final</Label>
              <select 
                className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary/40"
                value={resultData.status}
                onChange={(e) => setResultData({...resultData, status: e.target.value})}
              >
                <option value="visitada">Visitada (Sucesso)</option>
                <option value="nao_visitada">Não Visitada</option>
                <option value="sem_sucesso">Sem Sucesso / Recusado</option>
                <option value="remarcada">Remarcada</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/10">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-bold uppercase">Houve Venda?</Label>
                <p className="text-[9px] text-muted-foreground">Marque se o pedido foi fechado.</p>
              </div>
              <Switch 
                checked={resultData.sale_made}
                onCheckedChange={(checked) => setResultData({...resultData, sale_made: checked})}
              />
            </div>

            {resultData.sale_made && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Valor do Pedido (R$)</Label>
                <Input 
                  type="number" 
                  placeholder="0,00"
                  value={resultData.sale_value}
                  onChange={(e) => setResultData({...resultData, sale_value: e.target.value})}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Observações</Label>
              <Textarea 
                placeholder="Detalhes sobre a visita..."
                value={resultData.notes}
                onChange={(e) => setResultData({...resultData, notes: e.target.value})}
                className="resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultModalOpen(false)} className="text-[11px] font-bold uppercase">Cancelar</Button>
            <Button onClick={submitResult} disabled={savingResult} className="gap-2 text-[11px] font-bold uppercase">
              {savingResult ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Finalizar Visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
