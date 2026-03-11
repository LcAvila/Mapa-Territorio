import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity, Target, Users, TrendingUp, Filter, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRotas } from '@/contexts/RotasContext';

export function DensidadePanel() {
  const { planilhaData } = useRotas();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Análise de Densidade e Métricas</h2>
          <p className="text-sm text-muted-foreground">Mapeamento de calor, penetração de clientes e estatísticas do negócio.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border/40">
           <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Penetração (Ativos %)</CardTitle></CardHeader>
           <CardContent><p className="text-2xl font-bold flex items-center gap-2">0.0% <Activity className="w-4 h-4 text-primary" /></p></CardContent>
        </Card>
          <Card className="border-border/40 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                Clientes Atendidos
                <Users className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{planilhaData.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                da base de dados carregada
              </p>
            </CardContent>
          </Card>
        <Card className="border-border/40">
           <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Distância Média Viagem</CardTitle></CardHeader>
           <CardContent><p className="text-2xl font-bold flex items-center gap-2">0 km <BarChart3 className="w-4 h-4 text-primary" /></p></CardContent>
        </Card>
      </div>

      <Card className="border-border/40">
        <CardHeader className="border-b border-border/40">
          <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Heatmap (Mapa de Calor Regional)</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center bg-secondary/10">
           <div className="text-center text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">As métricas de calor aparecerão aqui após carregar os clientes geolreferenciados</p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
