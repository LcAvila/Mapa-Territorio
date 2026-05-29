import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, CheckCircle2, Circle, AlertCircle, Play } from 'lucide-react';

export interface VisitStop {
  id: number;
  sequence_number: number;
  client_name: string;
  address: string;
  city: string;
  status: 'pendente' | 'em_rota' | 'visitando' | 'visitada' | 'nao_visitada' | 'remarcada';
  classification?: string;
  distance_from_previous_km?: number;
  duration_from_previous_minutes?: number;
  checkin_id?: number;
  is_checked_in?: boolean;
}

interface VisitStopCardProps {
  stop: VisitStop;
  isActive: boolean;
  onCheckin: (stopId: number) => void;
  onViewDetails: (stopId: number) => void;
}

export const VisitStopCard: React.FC<VisitStopCardProps> = ({ stop, isActive, onCheckin, onViewDetails }) => {
  const getStatusIcon = () => {
    switch (stop.status) {
      case 'visitada': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'visitando': return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'nao_visitada': return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'em_rota': return <Play className="w-5 h-5 text-primary" />;
      default: return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    const variants: Record<string, string> = {
      visitada: 'bg-green-500/10 text-green-500 border-green-500/20',
      visitando: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      nao_visitada: 'bg-destructive/10 text-destructive border-destructive/20',
      em_rota: 'bg-primary/10 text-primary border-primary/20',
      pendente: 'bg-secondary text-muted-foreground',
    };
    return (
      <Badge variant="outline" className={`text-[10px] uppercase font-black ${variants[stop.status] || ''}`}>
        {stop.status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Card className={`border-l-4 transition-all ${isActive ? 'border-l-primary bg-primary/5 ring-1 ring-primary/20' : 'border-l-transparent'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-black text-muted-foreground/30">{stop.sequence_number}</span>
            {getStatusIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-sm truncate uppercase tracking-tight">{stop.client_name}</h3>
              {getStatusBadge()}
            </div>
            
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{stop.address}, {stop.city}</span>
            </p>

            <div className="flex items-center gap-3 mt-3">
              {stop.status === 'em_rota' && (
                <Button size="sm" onClick={() => onCheckin(stop.id)} className="h-8 gap-2 font-bold text-[11px] uppercase">
                  <Play className="w-3.5 h-3.5" /> Fazer Check-in
                </Button>
              )}

              {/* Confirmar Visita disponível para paradas não finalizadas */}
              {stop.status !== 'visitada' && (
                <Button size="sm" onClick={() => onViewDetails(stop.id)} className="h-8 gap-2 font-bold text-[11px] uppercase bg-green-50 border border-green-200 text-green-700 hover:bg-green-100">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Visita
                </Button>
              )}

              <Button size="sm" variant="ghost" onClick={() => onViewDetails(stop.id)} className="h-8 text-[11px] font-bold uppercase text-muted-foreground">
                Detalhes
              </Button>
            </div>
            {/* Extra details */}
            <div className="mt-3 text-[12px] text-muted-foreground flex flex-col gap-1">
              {typeof stop.distance_from_previous_km === 'number' && (
                <div className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {stop.distance_from_previous_km.toFixed(2)} km desde a parada anterior</div>
              )}
              {typeof stop.duration_from_previous_minutes === 'number' && (
                <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> {Math.round(stop.duration_from_previous_minutes)} min desde a parada anterior</div>
              )}
              <div className="flex items-center gap-2">
                {stop.is_checked_in ? <CheckCircle2 className="w-3 h-3 text-blue-500" /> : <Circle className="w-3 h-3 text-muted-foreground" />}
                <span>{stop.is_checked_in ? 'Check-in ativo' : 'Sem check-in'}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
