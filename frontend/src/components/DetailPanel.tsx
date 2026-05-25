import { X, Map as MapIcon, Loader2, RotateCcw, UserPlus, Users, Check, X as XIcon } from "lucide-react";
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
      <div className="bg-card border border-border rounded-lg overflow-hidden animate-in slide-in-from-right-4 duration-300">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between" style={{ background: "var(--gradient-header)" }}>
          <div>
            <h2 className="font-semibold text-foreground">{municipio}</h2>
            <p className="text-xs text-muted-foreground">{uf} · {modo === "planejamento" ? "Planejamento" : "Atendimento"}</p>
          </div>
          <div className="flex gap-1">
            {onDeselectState && (
              <button onClick={onDeselectState} title="Voltar ao Brasil" className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} title="Fechar painel" className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Responsáveis */}
        <div className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {modo === "planejamento" ? "Responsável Principal" : "Responsáveis"}
          </h3>

          {userIds.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sem responsável atribuído</p>
          ) : (role === "user" && estado_end && uf !== estado_end) ? (
            <div className="space-y-2">
              {userIds.some(id => getUserById(id, apiUsers)?.isVago) ? (
                <div className="flex items-center gap-3 p-2 rounded-md bg-secondary/50 border border-destructive/20">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ border: "2px dashed hsl(0, 70%, 50%)" }} />
                  <div><p className="text-sm font-medium text-destructive">Território Vago</p></div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-2 rounded-md bg-secondary/50">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-primary/60" />
                  <div><p className="text-sm font-medium text-foreground">Território Ocupado</p></div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {userIds.map((id, i) => {
                const user = getUserById(id, apiUsers);
                if (!user) return (
                  <div key={`${id}-${i}`} className="flex items-center gap-3 p-2 rounded-md bg-secondary/50">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-muted" />
                    <p className="text-sm font-medium text-foreground">{id}</p>
                  </div>
                );
                return (
                  <div key={`${id}-${i}`} className="flex items-center gap-3 p-2 rounded-md bg-secondary/50">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getUserColor(user), border: user.isVago ? "2px dashed hsl(0, 70%, 50%)" : "none" }}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.username} - {user.full_name || user.fullName}</p>
                      {user.isVago && <span className="text-[10px] text-destructive font-medium uppercase">VAGO</span>}
                      {i === 0 && modo === "atendimento" && userIds.length > 1 && (
                        <span className="text-[10px] text-primary font-medium ml-2">PRINCIPAL</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions (Bairros & Clientes) */}
          <div className="border-t border-border pt-4 mt-2 space-y-2">
            {canEditTerritories && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold transition-all bg-purple-600 text-white hover:bg-purple-700 shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                Atribuir Reps
              </button>
            )}

            <button
              onClick={handleViewBairros}
              disabled={loadingInfo || !onViewBairros}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isBairrosActive
                ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
            >
              {loadingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : isBairrosActive ? <RotateCcw className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
              {isBairrosActive ? "Esconder Bairros no Mapa" : "Visualizar Bairros no Mapa"}
            </button>

            <button
              onClick={onToggleClientes}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold transition-all ${showClientes
                ? "bg-cyan-600 text-white hover:bg-cyan-700 shadow-md"
                : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                }`}
            >
              <X className={`w-4 h-4 transition-transform ${showClientes ? "rotate-45" : "rotate-0 text-cyan-500"}`} />
              {showClientes ? "Ocultar Clientes no Mapa" : "Mostrar Clientes no Mapa"}
            </button>

            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              {isBairrosActive ? "Divisões municipais ativas." : "* Carrega os limites geográficos (IBGE) para este município."}
            </p>
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
