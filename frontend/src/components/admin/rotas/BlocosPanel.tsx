import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Grid3X3, List } from 'lucide-react';

export function BlocosPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gerenciamento de Blocos</h2>
          <p className="text-sm text-muted-foreground">Divida os Clusteres maiores em blocos de atendimento para roteirização eficiente.</p>
        </div>
      </div>
      
      <Card className="border-border/40">
        <CardHeader className="pb-3 border-b border-border/40 bg-secondary/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Visão Macroeconômica dos Blocos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-20 text-center text-muted-foreground">
          <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">Os blocos delimitam as áreas para visitas por dia da semana.</p>
          <p className="text-xs mt-1">Crie clusters primeiro para derivar seus blocos.</p>
        </CardContent>
      </Card>
    </div>
  );
}
