import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Layers, Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ClustersPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Clusters (Agrupamentos)</h2>
          <p className="text-sm text-muted-foreground">Agrupe áreas e crie concentrações de clientes inteligentes com IA.</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Cluster</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/40 col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Visualização de Clusters</CardTitle>
          </CardHeader>
          <CardContent className="h-96 flex items-center justify-center bg-secondary/20 rounded-b-xl border-t border-border/40">
             <div className="text-center text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium">Selecione uma área para agrupar</p>
             </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-sm">Parâmetros Ativos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-2">Defina variáveis logísticas:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Raio de Distância Máxima</li>
              <li>Tempo Mínimo de Deslocamento</li>
              <li>Fator de Concentração (Densidade)</li>
              <li>Capacidade Produtiva</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
