import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Filter, X, Loader2, ScrollText, User } from 'lucide-react';
import { UF_DATA } from '@/data/uf-codes';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  uf?: string;
  municipio?: string;
  performedBy: string;
  timestamp: string;
  ipAddress?: string;
}

interface Representative {
  id: number;
  code?: string;
  full_name?: string;
  fullName?: string;
  username: string;
}

interface AuditLogsPanelProps {
  auditLogs: AuditLog[];
  reps: Representative[];
  loadingAudit: boolean;
  fetchAuditLogs: () => void;
}

const auditActionLabel: Record<string, string> = {
  'create_user': 'Novo Usuário',
  'update_user': 'Editou Usuário',
  'delete_user': 'Removeu Usuário',
  'create_group': 'Novo Grupo',
  'delete_group': 'Removeu Grupo',
  'update_group': 'Editou Grupo',
  'accepted': 'Interesse Aceito',
  'rejected': 'Interesse Recusado',
  'clear_notifications': 'Limpar Notificações',
  'send_notification': 'Enviou Alerta'
};

export const AuditLogsPanel: React.FC<AuditLogsPanelProps> = ({
  auditLogs,
  reps,
  loadingAudit,
  fetchAuditLogs
}) => {
  const [auditFilterUser, setAuditFilterUser] = useState<string>('all');
  const [auditFilterUF, setAuditFilterUF] = useState<string>('all');
  const [auditFilterAction, setAuditFilterAction] = useState<string>('all');

  const filteredAudit = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditFilterUser && auditFilterUser !== 'all' && (log.details).includes(auditFilterUser)) return false;
      if (auditFilterUF && auditFilterUF !== 'all' && (log.uf || log.details).includes(auditFilterUF)) return false;
      if (auditFilterAction && auditFilterAction !== 'all' && log.action !== auditFilterAction) return false;
      return true;
    });
  }, [auditLogs, auditFilterUser, auditFilterUF, auditFilterAction]);

  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:pb-3 border-b border-border/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Filtros de Auditoria
            </CardTitle>
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full sm:hidden">
              {filteredAudit.length} registros
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            {/* Linha 1: Usuário */}
            <div className="flex-1">
              <Select value={auditFilterUser} onValueChange={setAuditFilterUser}>
                <SelectTrigger className="w-full h-10 bg-background/50 border-border text-xs sm:text-sm">
                  <SelectValue placeholder="Todos os Usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Usuários</SelectItem>
                  {reps.map(r => (
                    <SelectItem key={r.id} value={r.code || String(r.id)}>
                      {r.code ? `${r.code} — ` : ''}{r.full_name || r.fullName || r.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Linha 2: UF e Ação */}
            <div className="flex gap-2">
              <Select value={auditFilterUF} onValueChange={setAuditFilterUF}>
                <SelectTrigger className="flex-1 h-10 bg-background/50 border-border text-xs sm:text-sm">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas UFs</SelectItem>
                  {UF_DATA.map(u => (
                    <SelectItem key={u.sigla} value={u.sigla || 'empty'}>{u.sigla}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={auditFilterAction} onValueChange={setAuditFilterAction}>
                <SelectTrigger className="flex-[2] h-10 bg-background/50 border-border text-xs sm:text-sm">
                  <SelectValue placeholder="Todas as Ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  {Object.entries(auditActionLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k || 'empty'}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Linha 3: Botão Limpar e Contador Desktop */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 gap-1.5 flex-1 sm:flex-none text-xs font-bold hover:bg-destructive/10 hover:text-destructive border border-dashed border-border sm:border-none" 
                onClick={() => { setAuditFilterUser('all'); setAuditFilterAction('all'); setAuditFilterUF('all'); }}
              >
                <X className="w-3.5 h-3.5" /> Limpar Filtros
              </Button>
              <span className="hidden sm:inline text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                {filteredAudit.length} registros encontrados
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border/40 overflow-hidden bg-card/30 backdrop-blur-sm">
        <CardContent className="p-0">
          {loadingAudit ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
              <p className="text-sm text-muted-foreground">Carregando auditoria...</p>
            </div>
          ) : filteredAudit.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground">
              <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p className="text-sm font-medium">Nenhum registro encontrado</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-auto max-h-[calc(100vh-380px)] custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/10 bg-secondary/20">
                      <TableHead className="pl-6 h-11 text-[10px] font-black uppercase tracking-wider">Data/Hora</TableHead>
                      <TableHead className="h-11 text-[10px] font-black uppercase tracking-wider">Ação</TableHead>
                      <TableHead className="h-11 text-[10px] font-black uppercase tracking-wider">Entidade</TableHead>
                      <TableHead className="h-11 text-[10px] font-black uppercase tracking-wider">Detalhes</TableHead>
                      <TableHead className="w-24 pr-6 h-11 text-[10px] font-black uppercase tracking-wider">Por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAudit.map(log => (
                      <TableRow key={log.id} className="border-border/10 hover:bg-primary/5 transition-colors group">
                        <TableCell className="pl-6 py-4 text-[10px] text-muted-foreground tabular-nums whitespace-nowrap font-medium">{new Date(log.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell className="py-4"><span className="text-[9px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-tighter whitespace-nowrap">{auditActionLabel[log.action] || log.action}</span></TableCell>
                        <TableCell className="py-4 text-xs font-bold text-foreground/90">{log.entity}</TableCell>
                        <TableCell className="py-4 text-[11px] text-muted-foreground max-w-[320px] truncate group-hover:text-foreground/70 transition-colors">{log.details}</TableCell>
                        <TableCell className="py-4 text-[10px] font-bold text-muted-foreground pr-6 uppercase">{log.performedBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border/10 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
                {filteredAudit.map(log => (
                  <div key={log.id} className="p-4 space-y-2.5 active:bg-secondary/40 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md uppercase tracking-tighter">
                        {auditActionLabel[log.action] || log.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono font-bold opacity-60">
                        {new Date(log.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="bg-secondary/20 p-2.5 rounded-lg border border-border/30">
                      <p className="text-[11px] font-black text-foreground/90 mb-1">{log.entity}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{log.details}"</p>
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-2.5 h-2.5 text-primary" />
                      </div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{log.performedBy}</span>
                      {log.ipAddress && (
                        <span className="text-[8px] text-muted-foreground/40 ml-auto font-mono">{log.ipAddress}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
