import { X, Map as MapIcon, Loader2, RotateCcw, UserPlus, Users, Check, X as XIcon, Eye } from "lucide-react";
import { getUserColor, getUserById } from "@/data/representatives";
import { getMunicipioResponsaveis } from "@/data/territories";
import { useMunicipioInfo } from "@/hooks/use-geo-data";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context-core";
import { useState } from "react";
import { toast } from "sonner";
import type { SystemUser } from "@/data/representatives";
import type { TerritoryAssignment } from "@/data/territories";

interface DetailPanelProps {
  municipio: string;
  uf: string;
  municipioId?: number;
  modo: "planejamento" | "atendimento";
  onClose: () => void;
  onViewBairros?: (code: number | null) => void;
  ufCode?: number;
  isBairrosActive?: boolean;
  onDeselectState?: () => void;
  showClientes: boolean;
  onToggleClientes: () => void;
}

import { useApiUsers, useApiTerritories } from "@/hooks/use-api-data";

export default function DetailPanel({ 
  municipio, uf, municipioId, modo, onClose, onViewBairros, ufCode, 
  isBairrosActive, onDeselectState, showClientes, onToggleClientes 
}: DetailPanelProps) {
  const { role, estado_end, userId: loggedUserId } = useAuth();
  const { token } = useAuth();
  const { data: municipiosInfo, isLoading: loadingInfo } = useMunicipioInfo(ufCode || null);
  const { data: apiUsers = [] } = useApiUsers(!!token);
  const { data: apiTerritories = [] } = useApiTerritories(!!token);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  // Obter o usuário logado para verificar permissões
  const loggedUser = apiUsers.find((u: SystemUser) => u.id === loggedUserId);

  // Verificar se o usuário tem permissão de edição no módulo territories
  // Admin sempre tem permissão, outros usuários precisam de permissão explícita
  const canEditTerritories = role === 'admin' || 
    loggedUser?.role === 'admin' ||
    loggedUser?.permissions?.some((p: any) => 
      (p.moduleId === 'territories' || p.module?.id === 'territories') && p.canEdit
    ) || false;

  // Filtrar usuários que têm territórios no estado UF
  const usersInState = apiUsers.filter((u: SystemUser) => {
    // Verificar se o usuário tem algum território neste estado
    const hasTerritoryInState = apiTerritories.some((t: TerritoryAssignment) => 
      t.userId === u.id && t.uf === uf && t.modo === modo
    );
    return hasTerritoryInState;
  });

  const userIds = getMunicipioResponsaveis(municipio, uf, modo, apiTerritories);

  const normalizeCityName = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const handleAssignUsers = async () => {
    if (!token) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      // Adicionar novos usuários
      for (const userId of selectedUsers) {
        if (!userIds.includes(userId)) {
          const res = await fetch(`${API_BASE_URL}/api/admin/territories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ municipio, uf, userId, modo })
          });
          
          if (!res.ok) {
            const err = await res.json();
            toast.error(err.message || 'Erro ao atribuir usuário.');
            return;
          }
        }
      }
      
      toast.success('Usuários atribuídos com sucesso!');
      setShowAssignModal(false);
      setSelectedUsers([]);
      
      // Recarregar territórios
      window.location.reload();
    } catch (error) {
      toast.error('Erro de conexão ao atribuir usuários.');
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleViewBairros = () => {
    if (!onViewBairros) return;
    if (isBairrosActive) { onViewBairros(null); return; }

    // Strict requirement: must have a municipality ID to load neighborhoods
    if (municipioId) {
      onViewBairros(municipioId);
      return;
    }

    // Attempt to find it via API if missing (as fallback)
    if (!municipiosInfo) return;
    const targetName = normalizeCityName(municipio);
    const mun = municipiosInfo.find((m: { nome: string; id: number }) => normalizeCityName(m.nome) === targetName);
    if (mun) {
      onViewBairros(mun.id);
    } else {
      toast.error("Não foi possível identificar o código deste município para carregar bairros.");
    }
  };

  return (
    <>
      <div className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 w-[260px] shadow-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between bg-muted/40">
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-foreground truncate tracking-tight">{municipio}</h2>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{uf} · {modo === "planejamento" ? "Planejamento" : "Atendimento"}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {onDeselectState && (
              <button 
                onClick={onDeselectState} 
                title="Voltar ao Brasil" 
                className="p-1.5 rounded-lg hover:bg-secondary transition-all text-muted-foreground/60 hover:text-foreground active:scale-90"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button 
              onClick={onClose} 
              title="Fechar painel" 
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-all text-muted-foreground/60 hover:text-destructive active:scale-90"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Responsáveis */}
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
              <Users className="w-2.5 h-2.5" />
              {modo === "planejamento" ? "Responsável Principal" : "Responsáveis"}
            </h3>

            {userIds.length === 0 ? (
              <div className="py-1 px-1">
                <p className="text-[11px] text-muted-foreground italic font-medium">Sem responsável atribuído</p>
              </div>
            ) : (role === "user" && estado_end && uf !== estado_end) ? (
              <div className="space-y-2">
                {userIds.some(id => getUserById(id, apiUsers)?.isVago) ? (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-destructive/5 border border-destructive/10">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ border: "2px dashed hsl(0, 70%, 50%)" }} />
                    <p className="text-[11px] font-bold text-destructive/80 uppercase tracking-tight">Território Vago</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-secondary/30">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.3)]" />
                    <p className="text-[11px] font-bold text-foreground/70 uppercase tracking-tight">Território Ocupado</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {userIds.map((id, i) => {
                  const user = getUserById(id, apiUsers);
                  if (!user) return (
                    <div key={`${id}-${i}`} className="flex items-center gap-2.5 p-2 rounded-xl bg-secondary/20">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-muted" />
                      <p className="text-[11px] font-medium text-foreground/60">ID: {id}</p>
                    </div>
                  );
                  return (
                    <div key={`${id}-${i}`} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30 border border-transparent hover:border-border/40 transition-all group">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: getUserColor(user), border: user.isVago ? "1.5px dashed hsl(0, 70%, 50%)" : "none" }}
                      />
                      <div className="min-w-0 leading-tight">
                        <p className="text-[11px] font-bold text-foreground truncate">{user.full_name || user.fullName || user.username}</p>
                        <div className="flex gap-1.5 mt-0.5">
                          {user.isVago && <span className="text-[8px] text-destructive font-black uppercase tracking-tighter">VAGO</span>}
                          {i === 0 && modo === "atendimento" && userIds.length > 1 && (
                            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">PRINCIPAL</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions (Bairros & Clientes) */}
          <div className="pt-4 border-t border-border/20 flex flex-col gap-2">
            {canEditTerritories && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="w-full flex items-center justify-center gap-2.5 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/20 active:scale-[0.98]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Atribuir Reps
              </button>
            )}

            <button
              onClick={handleViewBairros}
              disabled={loadingInfo || !onViewBairros}
              className={`w-full flex items-center justify-center gap-2.5 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-[0.98] ${isBairrosActive
                ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border/50"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10"
                }`}
            >
              {loadingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapIcon className="w-3.5 h-3.5" />}
              {isBairrosActive ? "Esconder Bairros" : "Ver Bairros"}
            </button>

            <button
              onClick={onToggleClientes}
              className={`w-full flex items-center justify-center gap-2.5 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${showClientes
                ? "bg-cyan-600 text-white hover:bg-cyan-700 shadow-md shadow-cyan-500/20"
                : "bg-secondary/60 text-foreground hover:bg-secondary border border-border/50"
                }`}
            >
              {showClientes ? <X className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-cyan-500" />}
              {showClientes ? "Ocultar Clientes" : "Mostrar Clientes"}
            </button>
          </div>
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Atribuir Reps</h3>
              <button onClick={() => setShowAssignModal(false)} className="p-1 rounded-md hover:bg-secondary transition-colors">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                Selecione os Reps para atribuir a {municipio} ({uf}):
              </p>
              
              {usersInState.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum usuário disponível para este estado.</p>
              ) : (
                usersInState.map((user: SystemUser) => (
                  <div
                    key={user.id}
                    onClick={() => toggleUserSelection(user.id)}
                    className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                      selectedUsers.includes(user.id) 
                        ? 'bg-purple-600/20 border border-purple-600' 
                        : 'bg-secondary/50 hover:bg-secondary border border-transparent'
                    }`}
                  >
                    <div className="w-5 h-5 rounded border flex items-center justify-center">
                      {selectedUsers.includes(user.id) && <Check className="w-3 h-3 text-purple-600" />}
                    </div>
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getUserColor(user) }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.full_name || user.fullName || ''}</p>
                    </div>
                    {userIds.includes(user.id) && (
                      <span className="text-[10px] text-purple-600 font-medium uppercase">Já atribuído</span>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="px-4 py-3 border-t border-border flex gap-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all bg-secondary text-foreground hover:bg-secondary/80"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignUsers}
                disabled={selectedUsers.length === 0}
                className="flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Atribuir ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
