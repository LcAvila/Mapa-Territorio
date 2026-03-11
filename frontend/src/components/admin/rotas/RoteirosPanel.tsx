import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Map, Truck, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RoteirosPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Planejamento de Roteiros (Caixeiro Viajante)</h2>
          <p className="text-sm text-muted-foreground">Calcule as rotas lógicas otimizadas para percurso ponto a ponto.</p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><Play className="w-4 h-4" /> Gerar Otimização AI</Button>
      </div>
      
      <Card className="border-border/40">
        <CardHeader className="border-b border-border/40">
          <CardTitle className="text-sm flex items-center gap-2"><Map className="w-4 h-4 text-primary" /> Trilhas de Atendimento</CardTitle>
        </CardHeader>
        <CardContent className="py-24 text-center text-muted-foreground">
          <Truck className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-base font-semibold text-foreground">Sistema de Otimização de Roteiros</p>
          <p className="text-sm mt-1 max-w-md mx-auto">Após criar os blocos e prioridades da base, clique em "Gerar Otimização AI" para traçar o trajeto de menor custo/distância.</p>
        </CardContent>
      </Card>
    </div>
  );
}
