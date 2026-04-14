import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar, Clock, ChevronDown, MapPin, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { useRotas } from '@/contexts/RotasContext';
import { useApiClientes, useApiRepresentatives } from '@/hooks/use-api-data';

const SEMANAS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export function AgendaPanel() {
  const { selectedRepCode, setSelectedRepCode } = useRotas();
  const { data: reps = [] } = useApiRepresentatives(true);
  const { data: clientes = [], isLoading } = useApiClientes(selectedRepCode || null);

  // Distribui clientes: 4 semanas × 5 dias úteis
  const agenda = useMemo(() => {
    const grid: Record<string, Record<string, typeof clientes>> = {};
    SEMANAS.forEach(s => {
      grid[s] = {};
      DIAS.forEach(d => { grid[s][d] = []; });
    });

    clientes.forEach((c, idx) => {
      const semanaIdx = Math.floor(idx / (DIAS.length * Math.ceil(clientes.length / 20)));
      const semana = SEMANAS[Math.min(semanaIdx, 3)];
      const diaIdx = idx % DIAS.length;
      const dia = DIAS[diaIdx];
      grid[semana][dia].push(c);
    });

    return grid;
  }, [clientes]);

  const today = new Date();
  const diaSemana = today.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '').replace('ç', 'ç');

  const semanaColors = [
    'border-l-blue-500',
    'border-l-emerald-500',
    'border-l-orange-500',
    'border-l-purple-500',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Agenda de Visitas</h2>
          <p className="text-sm text-muted-foreground">
            Programação semanal e cronograma de atendimento por representante.
          </p>
        </div>

        <div className="relative min-w-[250px]">
          <select
            className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm appearance-none pr-10"
            value={selectedRepCode}
            onChange={e => setSelectedRepCode(e.target.value)}
          >
            <option value="">-- Selecione um Representante --</option>
            {reps.map(r => (
              <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {!selectedRepCode ? (
        <Card className="border-border/40">
          <CardContent className="py-20 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">Selecione um representante para gerar a agenda de visitas.</p>
            <p className="text-xs mt-1">A distribuição é feita automaticamente baseada nos clientes da carteira.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="border-border/40">
          <CardContent className="py-20 text-center text-primary">
            <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin opacity-50" />
            <p className="text-sm">Carregando carteira de clientes...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Grade de semanas e dias */}
          <div className="md:col-span-3 space-y-4">
            {SEMANAS.map((semana, sIdx) => (
              <Card key={semana} className={`border-border/40 overflow-hidden border-l-4 ${semanaColors[sIdx]}`}>
                <CardHeader className="pb-3 border-b border-border/40 bg-secondary/10">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {semana}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {Object.values(agenda[semana]).flat().length} visitas
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-5 divide-x divide-border/40">
                    {DIAS.map(dia => {
                      const visits = agenda[semana][dia];
                      return (
                        <div key={dia} className="min-h-[80px]">
                          <div className="px-2 py-1.5 border-b border-border/40 bg-secondary/20 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{dia.slice(0, 3)}</p>
                          </div>
                          <div className="p-1 space-y-1 min-h-[60px]">
                            {visits.slice(0, 3).map(c => (
                              <div key={c.id_cliente} className="text-[9px] leading-tight bg-primary/5 border border-primary/10 rounded px-1.5 py-1 truncate" title={c.nome_cliente}>
                                {c.nome_abreviado || c.nome_cliente.split(' ')[0]}
                              </div>
                            ))}
                            {visits.length > 3 && (
                              <div className="text-[9px] text-muted-foreground text-center py-0.5">+{visits.length - 3}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Painel lateral: resumo */}
          <div className="space-y-4">
            <Card className="border-border/40">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Resumo Mensal
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-3xl font-bold text-primary">{clientes.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">clientes na carteira</p>
                </div>
                <div className="space-y-2 text-xs">
                  {SEMANAS.map((semana, sIdx) => {
                    const count = Object.values(agenda[semana]).flat().length;
                    const colors = ['text-blue-600', 'text-emerald-600', 'text-orange-600', 'text-purple-600'];
                    return (
                      <div key={semana} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${sIdx === 0 ? 'bg-blue-500' : sIdx === 1 ? 'bg-emerald-500' : sIdx === 2 ? 'bg-orange-500' : 'bg-purple-500'}`} />
                          <span className="font-medium">{semana}</span>
                        </div>
                        <span className={`font-bold font-mono ${colors[sIdx]}`}>{count} visitas</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Próximas Visitas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {clientes.slice(0, 5).map(c => (
                  <div key={c.id_cliente} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{c.nome_abreviado || c.nome_cliente}</p>
                      {c.bairro && <p className="text-[10px] text-muted-foreground truncate">{c.bairro}</p>}
                    </div>
                  </div>
                ))}
                {clientes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma visita programada</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
