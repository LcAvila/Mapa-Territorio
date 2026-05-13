import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity, Users, BarChart3, MapPin, TrendingUp } from 'lucide-react';
import { useRotas } from '@/contexts/RotasContext';
import { useApiClientes, useApiRepresentatives } from '@/hooks/use-api-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DensidadePanel() {
  const { selectedUserId, setSelectedUserId } = useRotas();
  const { data: reps = [] } = useApiRepresentatives(true);
  const { data: clientes = [], isLoading } = useApiClientes(selectedUserId || null);

  const stats = useMemo(() => {
    const total = clientes.length;
    const comGps = clientes.filter(c => c.latitude && c.longitude).length;
    const semGps = total - comGps;

    // Distribuição por bairro
    const bairroMap: Record<string, number> = {};
    clientes.forEach(c => {
      if (c.bairro) bairroMap[c.bairro] = (bairroMap[c.bairro] || 0) + 1;
    });
    const topBairros = Object.entries(bairroMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const maxBairroCount = topBairros[0]?.[1] || 1;

    // Distribuição por UF
    const ufMap: Record<string, number> = {};
    clientes.forEach(c => {
      if (c.uf) ufMap[c.uf] = (ufMap[c.uf] || 0) + 1;
    });
    const topUfs = Object.entries(ufMap).sort((a, b) => b[1] - a[1]);

    const cobertura = total > 0 ? ((comGps / total) * 100).toFixed(1) : '0.0';

    return { total, comGps, semGps, topBairros, maxBairroCount, topUfs, cobertura };
  }, [clientes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Análise de Densidade e Métricas</h2>
          <p className="text-sm text-muted-foreground">
            Cobertura, penetração e distribuição geográfica real dos clientes.
          </p>
        </div>

        <div className="min-w-[250px]">
          <Select 
            value={selectedUserId ? String(selectedUserId) : 'all'} 
            onValueChange={val => setSelectedUserId(val === 'all' ? null : Number(val))}
          >
            <SelectTrigger className="w-full h-10 bg-background border border-input rounded-md text-sm">
              <SelectValue placeholder="Todos os Usuários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-- Todos os Usuários --</SelectItem>
              {reps.map(r => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.code ? `${r.code} — ` : ''}{r.full_name || r.fullName || r.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center justify-between">
              Total de Clientes <Users className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{isLoading ? '...' : stats.total}</p>
            <p className="text-[11px] text-muted-foreground mt-1">na carteira</p>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center justify-between">
              Cobertura GPS <MapPin className="w-4 h-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{isLoading ? '...' : `${stats.cobertura}%`}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{stats.comGps} com coordenadas</p>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center justify-between">
              Sem Geolocalização <Activity className="w-4 h-4 text-destructive" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{isLoading ? '...' : stats.semGps}</p>
            <p className="text-[11px] text-muted-foreground mt-1">precisam de geocode</p>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center justify-between">
              Bairros Únicos <TrendingUp className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{isLoading ? '...' : Object.keys(stats.topBairros).length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">áreas cobertas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Heatmap de bairros */}
        <Card className="border-border/40 md:col-span-2">
          <CardHeader className="border-b border-border/40 bg-secondary/10 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Concentração por Bairro (Top 8)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Carregando métricas...</div>
            ) : stats.topBairros.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                Selecione um usuário para ver a distribuição.
              </div>
            ) : (
              stats.topBairros.map(([bairro, count]) => {
                const pct = (count / stats.maxBairroCount) * 100;
                return (
                  <div key={bairro} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate max-w-[200px]">{bairro}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">{count} cliente{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Distribuição por UF */}
        <Card className="border-border/40">
          <CardHeader className="border-b border-border/40 bg-secondary/10 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Por Estado (UF)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : stats.topUfs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm opacity-60">
                Nenhum dado carregado.
              </div>
            ) : (
              <div className="space-y-2">
                {stats.topUfs.map(([uf, count]) => (
                  <div key={uf} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-sm font-bold font-mono text-primary">{uf}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{count}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({((count / stats.total) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
