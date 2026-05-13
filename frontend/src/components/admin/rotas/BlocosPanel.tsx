import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Grid3X3, MapPin, Users, Calendar } from 'lucide-react';
import { useRotas } from '@/contexts/RotasContext';
import { useApiClientes, useApiRepresentatives } from '@/hooks/use-api-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SEMANAS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
type Semana = typeof SEMANAS[number];

export function BlocosPanel() {
  const { selectedUserId, setSelectedUserId } = useRotas();
  const { data: reps = [] } = useApiRepresentatives(true);
  const { data: clientes = [], isLoading } = useApiClientes(selectedUserId || null);

  // Distribui clientes pelos 4 blocos semanais automaticamente
  const blocos = useMemo<Record<Semana, typeof clientes>>(() => {
    const result: Record<Semana, typeof clientes> = {
      'Semana 1': [], 'Semana 2': [], 'Semana 3': [], 'Semana 4': [],
    };
    clientes.forEach((c, idx) => {
      const semana = SEMANAS[idx % 4];
      result[semana].push(c);
    });
    return result;
  }, [clientes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gerenciamento de Blocos Semanais</h2>
          <p className="text-sm text-muted-foreground">
            Distribuição automática de clientes por semana para roteirização eficiente.
          </p>
        </div>

        <div className="min-w-[250px]">
          <Select 
            value={selectedUserId ? String(selectedUserId) : 'all'} 
            onValueChange={val => setSelectedUserId(val === 'all' ? null : Number(val))}
          >
            <SelectTrigger className="w-full h-10 bg-background border border-input rounded-md text-sm">
              <SelectValue placeholder="Selecione um Usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-- Selecione um Usuário --</SelectItem>
              {reps.map(r => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.code ? `${r.code} — ` : ''}{r.full_name || r.fullName || r.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedUserId ? (
        <Card className="border-border/40">
          <CardContent className="py-20 text-center text-muted-foreground">
            <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">Selecione um usuário para ver a distribuição de blocos.</p>
            <p className="text-xs mt-1">Cada bloco = 1 semana de trabalho.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {SEMANAS.map((semana, i) => {
              const count = blocos[semana].length;
              const colors = [
                'bg-blue-500/10 text-blue-600 border-blue-500/20',
                'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                'bg-orange-500/10 text-orange-600 border-orange-500/20',
                'bg-purple-500/10 text-purple-600 border-purple-500/20',
              ];
              return (
                <Card key={semana} className={`border ${colors[i]}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> {semana}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{count}</p>
                    <p className="text-[11px] mt-0.5 opacity-70">visitas programadas</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Grade de blocos com clientes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SEMANAS.map((semana, i) => {
              const colors = [
                { header: 'bg-blue-500/5 border-blue-500/20', dot: 'bg-blue-500' },
                { header: 'bg-emerald-500/5 border-emerald-500/20', dot: 'bg-emerald-500' },
                { header: 'bg-orange-500/5 border-orange-500/20', dot: 'bg-orange-500' },
                { header: 'bg-purple-500/5 border-purple-500/20', dot: 'bg-purple-500' },
              ];
              const c = colors[i];
              return (
                <Card key={semana} className={`border-border/40 overflow-hidden`}>
                  <CardHeader className={`pb-3 border-b ${c.header}`}>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                        {semana}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground bg-background border border-border px-2 py-0.5 rounded">
                        {blocos[semana].length} clientes
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="py-6 text-center text-muted-foreground text-xs">Carregando...</div>
                    ) : blocos[semana].length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-xs">
                        <Users className="w-6 h-6 mx-auto mb-2 opacity-20" />
                        Sem clientes neste bloco
                      </div>
                    ) : (
                      <div className="max-h-[200px] overflow-y-auto divide-y divide-border/40">
                        {blocos[semana].map((client) => (
                          <div key={client.id_cliente} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{client.nome_cliente}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {client.bairro ? `${client.bairro} · ` : ''}{client.codigo_cliente}
                              </p>
                            </div>
                            {(!client.latitude || !client.longitude) && (
                              <span className="text-[9px] text-destructive font-bold shrink-0">S/ GPS</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
