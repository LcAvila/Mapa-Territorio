import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Map as MapIcon, Calendar, User as UserIcon, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-base';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context-core';

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

export const SupervisorRoutesPanel: React.FC = () => {
  const { token, logout } = useAuth();
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [token]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/visit-route/summary`, {
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
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors">
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
    </div>
  );
};
