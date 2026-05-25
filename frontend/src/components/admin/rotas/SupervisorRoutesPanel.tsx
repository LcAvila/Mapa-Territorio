import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Map as MapIcon, Calendar, User as UserIcon, TrendingUp, CheckCircle2, Clock, AlertCircle, X, MapPin, Navigation } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-base';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context-core';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface RouteSummary {
  id: number;
  name: string;
  representative: string;
  date: string;
  total_stops: number;
  completed_stops: number;
  status: string;
  completion_rate: number;
}

/**
 * Componente que renderiza o mapa Leaflet de forma imperativa (sem react-leaflet MapContainer),
 * evitando o erro "Map container is already initialized" que ocorre quando o React
 * re-monta o componente (Strict Mode, Dialog Presence, etc.).
 */
function RouteMapView({ geoJSON }: { geoJSON: any }) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !geoJSON) return;

    let map: any = null;

    // Importar leaflet dinamicamente
    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Certificar que o container não tem mapa vinculado
      const container = containerRef.current;
      if (!container) return;
      
      // Limpar qualquer instância anterior do Leaflet neste container
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }

      // Determinar o centro
      const startFeature = geoJSON.features.find((f: any) => f.properties.type === 'start');
      const stopFeature = geoJSON.features.find((f: any) => f.properties.type === 'stop');
      const centerCoords = startFeature?.geometry.coordinates || stopFeature?.geometry.coordinates || [-47.9297, -15.7797];
      const center: [number, number] = [centerCoords[1], centerCoords[0]];

      map = L.map(container, { zoomControl: false }).setView(center, 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Linha da Rota
      const routeLine = geoJSON.features.find((f: any) => f.properties.type === 'route_line');
      if (routeLine) {
        L.geoJSON(routeLine, {
          style: { color: '#3b82f6', weight: 5, opacity: 0.6, dashArray: '10, 10' }
        }).addTo(map);
      }

      // Fix default marker icon issue com bundlers
      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Marcadores de Paradas
      const markers = geoJSON.features.filter((f: any) => f.properties.type !== 'route_line');
      markers.forEach((f: any) => {
        const marker = L.marker(
          [f.geometry.coordinates[1], f.geometry.coordinates[0]],
          { icon: defaultIcon }
        ).addTo(map);

        const typeLabel = f.properties.type === 'start' ? 'Início' : `Parada #${f.properties.sequence}`;
        const nameLabel = f.properties.label || f.properties.city || 'Localização';
        const statusHtml = f.properties.status
          ? `<span style="display:inline-block;margin-top:6px;padding:1px 6px;border:1px solid #ccc;border-radius:4px;font-size:8px;font-weight:800;text-transform:uppercase;">${f.properties.status}</span>`
          : '';

        marker.bindPopup(`
          <div style="padding:4px;">
            <p style="font-size:10px;font-weight:900;text-transform:uppercase;color:hsl(var(--primary));margin-bottom:4px;">${typeLabel}</p>
            <p style="font-size:12px;font-weight:700;">${nameLabel}</p>
            ${statusHtml}
          </div>
        `);
      });

      // Invalidar tamanho após o mapa ser montado no DOM do Dialog
      setTimeout(() => {
        map?.invalidateSize();
      }, 200);
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
        map = null;
      }
      mapRef.current = null;
    };
  }, [geoJSON]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}

export const SupervisorRoutesPanel: React.FC = () => {
  const { token, logout, userId, role } = useAuth();
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Mapa
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [loadingMap, setLoadingMap] = useState(false);

  const stats = useMemo(() => {
    if (routes.length === 0) return { completionRate: 0, inProgress: 0, pending: 0 };
    
    const totalStops = routes.reduce((acc, r) => acc + (r.total_stops || 0), 0);
    const totalCompleted = routes.reduce((acc, r) => acc + (r.completed_stops || 0), 0);
    const inProgress = routes.filter(r => r.status === 'em_execucao').length;
    const pending = routes.filter(r => r.status === 'pending' || r.status === 'pending_optimization').length;
    
    return {
      completionRate: totalStops > 0 ? Math.round((totalCompleted / totalStops) * 100) : 0,
      inProgress,
      pending
    };
  }, [routes]);

  useEffect(() => {
    if (token) {
      fetchRoutes();
    }
  }, [token, userId]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      // Para usuários comuns, buscamos apenas os roteiros deles
      const endpoint = role === 'admin' || role === 'supervisor' 
        ? `${API_BASE_URL}/api/visit-route/summary`
        : `${API_BASE_URL}/api/visit-route/summary?userId=${userId}`;

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        setRoutes(data);
      } else {
        setRoutes([]);
        if (response.status === 401) {
          toast.error('Sessão expirada. Por favor, faça login novamente.');
          logout();
        } else {
          console.error('Erro ao buscar roteiros:', data);
          toast.error('Falha ao carregar roteiros para supervisão.');
        }
      }
    } catch (error) {
      console.error('Erro ao buscar roteiros:', error);
      toast.error('Falha ao carregar roteiros para supervisão.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteGeoJSON = async (id: number) => {
    try {
      setLoadingMap(true);
      setRouteGeoJSON(null);
      setSelectedRouteId(id);
      const response = await fetch(`${API_BASE_URL}/api/visit-route/${id}/geojson`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRouteGeoJSON(data);
      } else {
        toast.error('Erro ao carregar mapa da rota.');
      }
    } catch (error) {
      toast.error('Erro ao carregar mapa da rota.');
    } finally {
      setLoadingMap(false);
    }
  };

  const closeMapDialog = useCallback(() => {
    setSelectedRouteId(null);
    setRouteGeoJSON(null);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-sm">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider">Acompanhamento de Visitas</h2>
            <p className="text-xs text-muted-foreground">Monitore o progresso e a execução dos roteiros em tempo real.</p>
          </div>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/40">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{stats.completionRate}%</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Taxa de Conclusão</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/40">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{stats.inProgress}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Roteiros em Execução</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/40">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{stats.pending}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aguardando Início</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Roteiros */}
      <Card className="border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-border/10 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Roteiros Ativos
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase">
              <Search className="w-3.5 h-3.5 mr-1" /> Filtrar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
              <p className="text-xs text-muted-foreground font-bold uppercase">Carregando dados...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/20 hover:bg-secondary/20 border-border/10">
                  <TableHead className="text-[10px] font-black uppercase pl-6">Representante</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Roteiro / Ciclo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Progresso</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground italic text-xs">
                      Nenhum roteiro encontrado para o período.
                    </TableCell>
                  </TableRow>
                ) : routes.map(route => (
                  <TableRow key={route.id} className="border-border/5 hover:bg-primary/5 transition-colors group">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-bold text-foreground/90">{route.representative}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{route.name}</span>
                        <Badge variant="outline" className={`w-fit text-[9px] h-4 px-1.5 uppercase font-black ${
                          route.status === 'em_execucao' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                          route.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                          'bg-muted text-muted-foreground'
                        }`}>
                          {route.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-[11px] font-mono text-muted-foreground">
                      {new Date(route.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1.5 w-32">
                        <div className="flex justify-between text-[10px] font-bold uppercase">
                          <span>{route.completion_rate}%</span>
                          <span className="text-muted-foreground">{route.completed_stops}/{route.total_stops}</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500" 
                            style={{ width: `${route.completion_rate}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => fetchRouteGeoJSON(route.id)}
                      >
                        <MapIcon className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal do Mapa tipo Waze */}
      {selectedRouteId !== null && (
        <Dialog open onOpenChange={(open) => {
          if (!open) closeMapDialog();
        }}>
          <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden bg-background border-border/40 flex flex-col gap-0">
            <DialogHeader className="p-4 border-b border-border/10 flex flex-row items-center justify-between shrink-0">
              <div>
                <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary animate-pulse" /> 
                  Visualização de Rota
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground">
                  Trajeto programado e progresso das visitas
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={closeMapDialog}>
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>
            
            <div className="flex-1 relative bg-muted/20 overflow-hidden" style={{ minHeight: 0 }}>
              {loadingMap ? (
                <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Gerando mapa da rota...</p>
                </div>
              ) : routeGeoJSON && (
                <>
                  <RouteMapView geoJSON={routeGeoJSON} />
                  
                  {/* Overlay Informativo Estilo Waze */}
                  <div className="absolute bottom-6 left-6 right-6 z-[1000] flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {routeGeoJSON.features
                      .filter((f: any) => f.properties.type === 'stop')
                      .sort((a: any, b: any) => a.properties.sequence - b.properties.sequence)
                      .map((stop: any) => (
                        <Card key={stop.properties.sequence} className="min-w-[180px] bg-card/90 backdrop-blur-md border-border/40 shadow-2xl shrink-0 ring-1 ring-white/10">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                stop.properties.status === 'visitada' ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'
                              }`}>
                                {stop.properties.sequence}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase truncate">{stop.properties.city}</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase">{stop.properties.status}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
