/**
 * ResumoRoteiroPanel.tsx
 *
 * Replica e supera a aba "Resumo Roteiro" da planilha Excel.
 * Agrega os resultados calculados pela HERE API e exibe KPIs por representante/semana:
 * total de visitas, distância total, tempo total, cidade inicial e final.
 */
import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  BarChart2, MapPin, Clock, Route, Users, TrendingUp,
  CheckCircle2, Calendar, Navigation2, Info
} from 'lucide-react';
import { useRotas } from '@/contexts/RotasContext';
import { useApiUsers, useApiClientes } from '@/hooks/use-api-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SEMANAS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];

function formatKm(meters: number) {
  return `${(meters / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} km`;
}

export function ResumoRoteiroPanel() {
  const { routeResults, selectedUserId, setSelectedUserId } = useRotas();
  const { data: users = [] } = useApiUsers(true);
  const { data: clientes = [] } = useApiClientes(selectedUserId || null);

  // Agrupa os resultados por usuário
  const summary = useMemo(() => {
    return routeResults.map(entry => {
      const { userId, semana, result, clients, calculatedAt } = entry;
      const user = users.find(u => u.id === userId);

      // Pega cidades únicas percorridas
      const cidades = [...new Set(clients.map(c => c.cidade).filter(Boolean))];
      const ufs = [...new Set(clients.map(c => c.uf).filter(Boolean))];
      const cidadeInicio = clients[0]?.cidade || '—';
      const cidadeFim = clients[clients.length - 1]?.cidade || '—';
      const kmTotal = result.totalDistance;
      const kmMedio = clients.length > 0 ? kmTotal / clients.length : 0;

      return {
        userId,
        userName: user ? user.full_name || user.fullName || user.username : `ID: ${userId}`,
        semana,
        ufs: ufs.join(', '),
        cidades: cidades.length,
        totalVisitas: clients.length,
        kmTotal,
        kmTotalFmt: formatKm(kmTotal),
        kmMedioFmt: formatKm(kmMedio),
        durationFmt: result.durationFormatted,
        cidadeInicio,
        cidadeFim,
        calculatedAt,
      };
    }).sort((a, b) => {
      if (a.userName !== b.userName) return a.userName.localeCompare(b.userName);
      return SEMANAS.indexOf(a.semana) - SEMANAS.indexOf(b.semana);
    });
  }, [routeResults, users]);

  // KPIs globais
  const globals = useMemo(() => {
    if (summary.length === 0) return null;
    const totalVisitas = summary.reduce((a, s) => a + s.totalVisitas, 0);
    const totalKm = summary.reduce((a, s) => a + s.kmTotal, 0);
    const avgKm = totalKm / summary.length;
    const usersUnicos = [...new Set(summary.map(s => s.userId))].length;
    return { totalVisitas, totalKm, avgKm, usersUnicos };
  }, [summary]);

  // Estimativa para semanas não calculadas ainda
  const semanasSemCalculo = useMemo(() => {
    if (!selectedUserId) return [];
    const calculadas = routeResults
      .filter(r => r.userId === selectedUserId)
      .map(r => r.semana);
    return SEMANAS.filter(s => !calculadas.includes(s));
  }, [selectedUserId, routeResults]);

  const clientesTotal = clientes.filter(c => c.latitude && c.longitude).length;
  const estimativaPorSemana = Math.ceil(clientesTotal / 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Resumo de Roteiros
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada dos roteiros calculados pela HERE API. Replica e supera a aba "Resumo Roteiro" do Excel.
          </p>
        </div>
        <div className="min-w-[250px]">
          <Select 
            value={selectedUserId ? String(selectedUserId) : 'all'} 
            onValueChange={val => setSelectedUserId(val === 'all' ? null : Number(val))}
          >
            <SelectTrigger className="w-full h-10 bg-background border border-input rounded-md text-sm">
              <SelectValue placeholder="Filtrar por Usuário Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-- Filtrar por Usuário Responsável --</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.username} — {u.full_name || u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Nenhuma rota calculada ainda */}
      {summary.length === 0 && (
        <Card className="border-border/40">
          <CardContent className="py-20 text-center text-muted-foreground">
            <BarChart2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-base font-semibold text-foreground">Nenhum roteiro calculado ainda</p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              Vá até a aba <strong>"Roteiro Sequencial"</strong>, selecione um usuário e calcule
              os roteiros de cada semana. Os resultados aparecerão aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPIs globais */}
      {globals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Roteiros Calculados', value: summary.length, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Usuários Ativos', value: globals.usersUnicos, icon: Users, color: 'text-primary' },
            { label: 'Total de Visitas', value: globals.totalVisitas, icon: MapPin, color: 'text-blue-600' },
            { label: 'KM Total Acumulado', value: formatKm(globals.totalKm), icon: Route, color: 'text-orange-500' },
          ].map(k => (
            <Card key={k.label} className="border-border/40">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estimativa para semanas ainda não calculadas */}
      {selectedUserId && semanasSemCalculo.length > 0 && clientesTotal > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-3 border-b border-yellow-500/15">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <Calendar className="w-4 h-4" /> Semanas pendentes de cálculo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {semanasSemCalculo.map(semana => (
                <div key={semana} className="p-3 border border-yellow-500/20 rounded-lg text-center">
                  <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400">{semana}</p>
                  <p className="text-lg font-bold mt-1">~{estimativaPorSemana}</p>
                  <p className="text-[10px] text-muted-foreground">visitas estimadas</p>
                  <p className="text-[10px] text-yellow-600 mt-1 font-medium">⏳ Aguardando cálculo</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de resumo — réplica da aba "Resumo Roteiro" do Excel */}
      {summary.length > 0 && (
        <Card className="border-border/40 overflow-hidden">
          <CardHeader className="bg-secondary/10 border-b border-border/40 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Resumo por Roteiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="pl-4">Usuário Responsável</TableHead>
                    <TableHead>Semana</TableHead>
                    <TableHead>Estados</TableHead>
                    <TableHead className="text-center">Cidades</TableHead>
                    <TableHead className="text-center">Visitas</TableHead>
                    <TableHead className="text-center">KM Total</TableHead>
                    <TableHead className="text-center">KM Médio</TableHead>
                    <TableHead className="text-center">Duração</TableHead>
                    <TableHead>Inicia em</TableHead>
                    <TableHead>Termina em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary
                    .filter(s => !selectedUserId || s.userId === selectedUserId)
                    .map((s, idx) => (
                      <TableRow key={`${s.userId}-${s.semana}`} className="border-border/30 hover:bg-secondary/30">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-7 rounded-full bg-primary/20" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{s.userName}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">ID: {s.userId}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            s.semana === 'Semana 1' ? 'bg-blue-500/10 text-blue-600' :
                            s.semana === 'Semana 2' ? 'bg-emerald-500/10 text-emerald-600' :
                            s.semana === 'Semana 3' ? 'bg-orange-500/10 text-orange-600' :
                            'bg-purple-500/10 text-purple-600'
                          }`}>
                            {s.semana}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold">{s.ufs || '—'}</TableCell>
                        <TableCell className="text-center text-sm font-semibold">{s.cidades}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-bold text-primary">{s.totalVisitas}</span>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono font-bold text-emerald-600">{s.kmTotalFmt}</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{s.kmMedioFmt}</TableCell>
                        <TableCell className="text-center">
                          <span className="flex items-center justify-center gap-1 text-xs text-orange-600">
                            <Clock className="w-3 h-3" /> {s.durationFmt}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs flex items-center gap-1">
                            <span className="text-emerald-500">▶</span>
                            {s.cidadeInicio}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs flex items-center gap-1">
                            <span className="text-blue-500">⏹</span>
                            {s.cidadeFim}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown por semana (cards visuais) */}
      {summary.filter(s => !selectedUserId || s.userId === selectedUserId).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary
            .filter(s => !selectedUserId || s.userId === selectedUserId)
            .map(s => {
              const semanaColors: Record<string, { border: string; badge: string; icon: string }> = {
                'Semana 1': { border: 'border-l-blue-500', badge: 'bg-blue-500/10 text-blue-600', icon: '🔵' },
                'Semana 2': { border: 'border-l-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600', icon: '🟢' },
                'Semana 3': { border: 'border-l-orange-500', badge: 'bg-orange-500/10 text-orange-600', icon: '🟠' },
                'Semana 4': { border: 'border-l-purple-500', badge: 'bg-purple-500/10 text-purple-600', icon: '🟣' },
              };
              const cc = semanaColors[s.semana] || semanaColors['Semana 1'];
              return (
                <Card key={`card-${s.userId}-${s.semana}`} className={`border-border/40 border-l-4 ${cc.border}`}>
                  <CardHeader className="pb-3 border-b border-border/40 bg-secondary/5">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${cc.badge}`}>
                          {cc.icon} {s.semana}
                        </span>
                        <span className="font-mono text-primary text-xs">{s.userName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">
                        {new Date(s.calculatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Visitas Totais</p>
                      <p className="text-lg font-bold text-primary">{s.totalVisitas}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">KM Total (HERE)</p>
                      <p className="text-lg font-bold text-emerald-600">{s.kmTotalFmt}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duração Est.</p>
                      <p className="font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange-500" /> {s.durationFmt}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">KM Médio/Visita</p>
                      <p className="font-semibold">{s.kmMedioFmt}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-border/40">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <span>▶</span> {s.cidadeInicio}
                        </span>
                        <Navigation2 className="w-3 h-3 text-muted-foreground" />
                        <span className="flex items-center gap-1 text-blue-600">
                          {s.cidadeFim} <span>⏹</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 text-blue-600 text-xs">
        <Info className="w-4 h-4 shrink-0" />
        <span>
          Os dados desta tela são calculados em tempo real pela <strong>HERE Routing API v8</strong>,
          substituindo a aba "Resumo Roteiro" da planilha Excel com distâncias e tempos reais por rota.
        </span>
      </div>
    </div>
  );
}
