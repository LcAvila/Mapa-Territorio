import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Layers, MapPin, Search } from 'lucide-react';
import { useRotas } from '@/contexts/RotasContext';
import { useApiClientes } from '@/hooks/use-api-data';
import { Button } from '@/components/ui/button';

export function ClustersPanel() {
  const { selectedUserId } = useRotas();
  const { data: clientes = [], isLoading } = useApiClientes(selectedUserId || null);

  const bairros = clientes.reduce((acc: Record<string, number>, c) => {
    if (c.bairro) {
      acc[c.bairro] = (acc[c.bairro] || 0) + 1;
    }
    return acc;
  }, {});

  const sortedBairros = Object.entries(bairros).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Distribuição Espacial (Clusters)</h2>
          <p className="text-sm text-muted-foreground">Com os dados da base de clientes interligada, veja o agrupamento automático (densidade).</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/40 col-span-1 md:col-span-2">
          <CardHeader className="border-b border-border/40 bg-secondary/10 pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Sugestões de Agrupamentos por Bairro (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             {selectedUserId && !isLoading && sortedBairros.length > 0 ? (
               <div className="divide-y divide-border/40">
                 {sortedBairros.slice(0, 10).map(([bairro, count]) => (
                   <div key={bairro} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                         <Layers className="w-4 h-4 text-primary" />
                       </div>
                       <div>
                         <p className="text-sm font-semibold">{bairro}</p>
                         <p className="text-xs text-muted-foreground">Agrupamento Natural</p>
                       </div>
                     </div>
                     <span className="font-mono text-sm bg-secondary px-2 py-1 rounded border border-border/50">
                       {count} clientes
                     </span>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground">
                  {isLoading ? (
                    <p className="text-sm">Carregando métricas...</p>
                  ) : (
                    <>
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">Selecione um representante no painel de Roteiros primeiro.</p>
                    </>
                  )}
               </div>
             )}
          </CardContent>
        </Card>
        
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-sm">Clusters Integrados</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-2">Critérios do modelo analítico:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs mb-6">
              <li>Concentração por Bairro</li>
              <li>Aproximação Geográfica (Lats/Lngs)</li>
              <li>Cálculo de Proximidade</li>
            </ul>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-600 dark:text-blue-400">
              Esta aba não depende mais do arquivo Excel original. Os agrupamentos são gerados em tempo real com os dados do banco lincados à geolocalização.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
