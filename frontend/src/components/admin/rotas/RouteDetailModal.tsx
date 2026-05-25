import React from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  X,
  Map as MapIcon,
  User,
  Calendar,
  Navigation,
  MapPin,
  Route,
  FileText,
  ArrowDown,
} from 'lucide-react';

export interface RouteDetailData {
  id: number;
  name: string;
  status: string;
  semana?: string | null;
  route_date: string;
  representative: { id: number; name: string };
  cycle?: { id: number; name: string; status: string; period: string } | null;
  week?: { number: number; period: string } | null;
  start: { label: string; lat: number | null; lng: number | null };
  motivo: string;
  summary: {
    total_stops: number;
    completed_stops: number;
    total_distance_km: number;
    average_km_per_visit: number;
    total_duration_minutes?: number | null;
    optimization_provider?: string | null;
  };
  stops: Array<{
    id: number;
    sequence_number: number;
    status: string;
    classification?: string | null;
    logistic_note?: string | null;
    visit_reason: string;
    distance_from_previous_km: number | null;
    cliente: {
      id: number | null;
      nome: string;
      nome_abreviado?: string | null;
      cnpj?: string | null;
      prioridade?: string | null;
      semana_cliente?: string | null;
    };
    endereco: {
      completo?: string | null;
      logradouro?: string | null;
      numero?: string | null;
      bairro?: string | null;
      cidade?: string | null;
      uf?: string | null;
      cep?: string | null;
    };
  }>;
}

interface RouteDetailModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  data: RouteDetailData | null;
  onViewMap?: () => void;
}

function formatAddress(endereco: RouteDetailData['stops'][0]['endereco']): string {
  const parts = [
    endereco.logradouro || endereco.completo,
    endereco.numero ? `nº ${endereco.numero}` : null,
    endereco.bairro,
    endereco.cidade && endereco.uf ? `${endereco.cidade}/${endereco.uf}` : endereco.cidade || endereco.uf,
    endereco.cep ? `CEP ${endereco.cep}` : null,
  ].filter(Boolean);
  return parts.join(' · ') || 'Endereço não cadastrado';
}

function statusBadgeClass(status: string): string {
  if (status === 'em_execucao') return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  if (status === 'completed' || status === 'visitada') return 'bg-green-500/10 text-green-500 border-green-500/20';
  if (status === 'visitando' || status === 'em_rota') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  return 'bg-muted text-muted-foreground';
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({
  open,
  onClose,
  loading,
  data,
  onViewMap,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0"
      >
        <DialogHeader className="p-4 pr-14 border-b border-border/10 shrink-0 space-y-0">
          <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            {data?.name ?? 'Detalhes do Roteiro'}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground mt-1">
            Visão completa das visitas, endereços e distâncias
          </DialogDescription>
          <DialogClose className="absolute right-4 top-4 rounded-full h-8 w-8 flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-muted">
            <X className="w-4 h-4" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase text-muted-foreground">Carregando detalhes...</p>
            </div>
          ) : data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-[9px] font-black uppercase ${statusBadgeClass(data.status)}`}>
                  {data.status.replace(/_/g, ' ')}
                </Badge>
                {data.semana && (
                  <Badge variant="outline" className="text-[9px] font-black uppercase">
                    {data.semana}
                  </Badge>
                )}
                {onViewMap && (
                  <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase ml-auto" onClick={onViewMap}>
                    <MapIcon className="w-3.5 h-3.5 mr-1" /> Ver mapa
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-muted/20 border-border/30">
                  <CardContent className="p-3">
                    <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" /> Representante
                    </p>
                    <p className="text-xs font-bold mt-1">{data.representative.name}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20 border-border/30">
                  <CardContent className="p-3">
                    <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Data
                    </p>
                    <p className="text-xs font-bold mt-1">
                      {new Date(data.route_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20 border-border/30">
                  <CardContent className="p-3">
                    <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
                      <Route className="w-3 h-3" /> Distância total
                    </p>
                    <p className="text-xs font-bold mt-1">{data.summary.total_distance_km} km</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20 border-border/30">
                  <CardContent className="p-3">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Progresso</p>
                    <p className="text-xs font-bold mt-1">
                      {data.summary.completed_stops}/{data.summary.total_stops} visitas
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase text-primary flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" /> Motivo / Contexto do roteiro
                  </p>
                  <p className="text-xs text-foreground/90 leading-relaxed">{data.motivo}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Partida: <span className="font-bold text-foreground">{data.start.label}</span>
                    {data.cycle && (
                      <> · Ciclo: <span className="font-bold">{data.cycle.name}</span> ({data.cycle.period})</>
                    )}
                    {data.week && (
                      <> · Semana {data.week.number} ({data.week.period})</>
                    )}
                  </p>
                  {data.summary.average_km_per_visit > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Média de {data.summary.average_km_per_visit} km entre paradas
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Paradas ({data.stops.length})
                </p>

                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-[11px] top-3 bottom-3 w-0.5 border-l-2 border-dashed border-primary/25" />

                  <div className="relative">
                    <span className="absolute -left-6 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                      <Navigation className="w-3 h-3 text-muted-foreground" />
                    </span>
                    <Card className="bg-secondary/30 border-border/40">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Ponto de partida</p>
                        <p className="text-xs font-bold">{data.start.label}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {data.stops.map((stop) => (
                    <div key={stop.id} className="relative">
                      <span className="absolute -left-6 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shadow-sm">
                        {stop.sequence_number}
                      </span>

                      {stop.distance_from_previous_km != null && (
                        <div className="flex items-center gap-1.5 -mt-1 mb-2 ml-1 text-[9px] font-black uppercase text-primary/80">
                          <ArrowDown className="w-3 h-3" />
                          {stop.distance_from_previous_km.toFixed(1)} km do ponto anterior
                        </div>
                      )}

                      <Card className="border-border/40 hover:border-primary/30 transition-colors">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-black text-foreground">{stop.cliente.nome}</p>
                              {stop.cliente.nome_abreviado && (
                                <p className="text-[10px] text-muted-foreground">{stop.cliente.nome_abreviado}</p>
                              )}
                            </div>
                            <Badge variant="outline" className={`text-[8px] font-black uppercase ${statusBadgeClass(stop.status)}`}>
                              {stop.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                            <span className="leading-relaxed">{formatAddress(stop.endereco)}</span>
                          </div>

                          {(stop.cliente.prioridade || stop.classification) && (
                            <div className="flex flex-wrap gap-1.5">
                              {stop.cliente.prioridade && (
                                <Badge variant="secondary" className="text-[8px] font-bold uppercase">
                                  Prioridade: {stop.cliente.prioridade}
                                </Badge>
                              )}
                              {stop.classification && (
                                <Badge variant="secondary" className="text-[8px] font-bold uppercase">
                                  {stop.classification}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="rounded-md bg-muted/40 p-2.5 border border-border/30">
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Motivo da visita</p>
                            <p className="text-[11px] text-foreground/90 leading-relaxed">{stop.visit_reason}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-12">Não foi possível carregar os detalhes.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
