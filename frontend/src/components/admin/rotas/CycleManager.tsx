import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Calendar, Users, ArrowRight, Loader2, CheckCircle2, History } from 'lucide-react';
import { useRotas } from '@/contexts/RotasContext';
import { routePlanningService } from '@/services/route-planning';
import { useApiUsers } from '@/hooks/use-api-data';
import { useAuth } from '@/contexts/auth-context-core';
import { toast } from 'sonner';
import { RouteCycle } from '@/types/routes';

export function CycleManager() {
  const { currentCycle, setCurrentCycle } = useRotas();
  const { userId } = useAuth();
  const { data: users = [] } = useApiUsers(true);
  const [loading, setLoading] = useState(false);
  
  const [newCycle, setNewCycle] = useState({
    name: '',
    start_date: '',
    end_date: '',
    supervisor_user_id: ''
  });

  const handleCreateCycle = async () => {
    if (!newCycle.name || !newCycle.start_date || !newCycle.supervisor_user_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!userId) {
      toast.error('Sua sessão expirou. Faça login novamente.');
      return;
    }

    setLoading(true);
    try {
      // Data final é automaticamente 4 semanas depois
      const start = new Date(newCycle.start_date);
      const end = new Date(start);
      end.setDate(start.getDate() + 28);

      const cycle = await routePlanningService.createCycle({
        ...newCycle,
        end_date: end.toISOString(),
        supervisor_user_id: Number(newCycle.supervisor_user_id),
        created_by: userId
      });

      setCurrentCycle(cycle);
      toast.success('Ciclo de planejamento criado com sucesso!');
      
      // Distribuir automaticamente
      toast.info('Iniciando distribuição automática de clientes...');
      await routePlanningService.distributeClients(cycle.id);
      toast.success('Clientes distribuídos nas 4 semanas!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/40 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Novo Ciclo de Planejamento
            </CardTitle>
            <CardDescription>
              Inicie um novo ciclo de 4 semanas para um usuário.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Ciclo</Label>
              <Input 
                placeholder="Ex: Planejamento Maio 2026" 
                value={newCycle.name}
                onChange={e => setNewCycle(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input 
                  type="date" 
                  value={newCycle.start_date}
                  onChange={e => setNewCycle(p => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Usuário</Label>
                <select 
                  className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm"
                  value={newCycle.supervisor_user_id}
                  onChange={e => setNewCycle(p => ({ ...p, supervisor_user_id: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button 
              className="w-full gap-2 mt-4" 
              onClick={handleCreateCycle}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Gerar Planejamento (4 Semanas)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Ciclo Ativo
            </CardTitle>
            <CardDescription>
              Status do planejamento atual em execução.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentCycle ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <h3 className="font-bold text-primary text-lg">{currentCycle.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(currentCycle.start_date).toLocaleDateString()}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{new Date(currentCycle.end_date).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-4">
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase">
                      {currentCycle.status}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border/40 bg-background/50 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Semanas</p>
                    <p className="text-xl font-black">4</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border/40 bg-background/50 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                    <p className="text-sm font-bold text-emerald-500 uppercase">Ativo</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-sm">Nenhum ciclo ativo selecionado.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
