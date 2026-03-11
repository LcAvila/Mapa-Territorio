import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';

export function AgendaPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Agenda e Cronograma</h2>
          <p className="text-sm text-muted-foreground">Acompanhe as visitas programadas e frequências semanais.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-border/40 col-span-1 md:col-span-3">
          <CardHeader className="border-b border-border/40">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Visão Geral do Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center bg-secondary/10 text-center text-muted-foreground">
             <div>
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium">Cronograma Mensal Integrado</p>
             </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Próximas Atividades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="text-xs text-muted-foreground text-center py-10 opacity-60">Nenhum percurso iniciado recentemente.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
