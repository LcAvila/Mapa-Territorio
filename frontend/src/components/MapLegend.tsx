import { useApiUsers, useApiTerritories, Cliente, SystemUser } from "@/hooks/use-api-data";
import { getUserColor } from "@/data/representatives";
import { useAuth } from "@/contexts/auth-context-core";
import { Users, FilterX, MapPin } from "lucide-react";
import { useMemo } from "react";

interface MapLegendProps {
  selectedUF: string | null;
  modo: "planejamento" | "atendimento";
  filtroUsuario: string | null;
  onFilterUser: (id: string | null) => void;
  clients: Cliente[];
  mostrarVagos: boolean;
  onToggleVagos: () => void;
}

export default function MapLegend({
  selectedUF,
  modo,
  filtroUsuario,
  onFilterUser,
  mostrarVagos,
  onToggleVagos,
  clients,
}: MapLegendProps) {
  const { token, role, userId: loggedUserId } = useAuth();
  const { data: users = [] } = useApiUsers(!!token);
  const { data: apiTerritories = [] } = useApiTerritories(!!token);

  const filteredApiTerritories = useMemo(() => {
    if (role === 'admin') return apiTerritories;
    
    const currentUser = users.find(u => u.id === loggedUserId);
    const managedIds = currentUser?.managedUserIds || [];
    
    return apiTerritories.filter(t => 
      t.userId === loggedUserId || managedIds.includes(t.userId || 0)
    );
  }, [role, apiTerritories, users, loggedUserId]);

  // Get the set of userIds that have clients OR territories in the selected UF
  const userIdsInUF = useMemo(() => {
    if (!selectedUF) return null;
    const ids = new Set<number>();
    
    // Add users with clients in UF
    clients.forEach(c => {
      if (c.uf === selectedUF && c.userId) ids.add(c.userId);
    });
    
    // Add users with territories in UF
    filteredApiTerritories.forEach(t => {
      if (t.uf === selectedUF && t.userId) ids.add(t.userId);
    });
    
    return ids;
  }, [selectedUF, clients, filteredApiTerritories]);

  // Filter users: if a UF is selected, show only those who have clients/territories there
  // Also, if not an admin, restrict the list to the user's id and their team if supervisor.
  const relevantUsers = users.filter(user => {
    const currentUser = users.find(u => u.id === loggedUserId);
    const managedIds = currentUser?.managedUserIds || [];

    const isMeOrTeam = user.id === loggedUserId || managedIds.includes(user.id);

    if (role !== 'admin' && !isMeOrTeam) return false;
    if (!userIdsInUF) return true;
    return userIdsInUF.has(user.id);
  });

  const activeUsers = relevantUsers.filter(r => !r.isVago);
  const vagoUsers = relevantUsers.filter(r => r.isVago);

  return (
    <div className="bg-card/85 backdrop-blur-md border border-border/40 rounded-xl p-3 space-y-3 w-[240px] shadow-xl ring-1 ring-white/5">
      <div className="flex items-center justify-between pb-2 border-b border-border/20">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-primary/15">
            <Users className="w-3 h-3 text-primary" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-tight text-foreground/70">
              {selectedUF ? `Equipe ${selectedUF}` : "Reps"}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
           <MapPin className="w-2.5 h-2.5 text-muted-foreground/60" />
           <span className="text-[9px] font-medium text-muted-foreground/60 uppercase">
             {selectedUF || "Brasil"}
           </span>
        </div>
      </div>

      <div className="max-h-[240px] overflow-y-auto pr-1 custom-scrollbar space-y-1">
        {activeUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 px-2 text-center space-y-1.5 opacity-50">
             <FilterX className="w-6 h-6 text-muted-foreground/30" />
             <p className="text-[10px] text-muted-foreground italic leading-tight">
               Nenhum responsável {selectedUF ? `em ${selectedUF}` : ""}
             </p>
          </div>
        ) : (
          activeUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => (role === 'admin' || role === 'supervisor') ? onFilterUser(filtroUsuario === String(user.id) ? null : String(user.id)) : undefined}
              className={`w-full group flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all duration-200 relative overflow-hidden ${
                filtroUsuario === String(user.id)
                  ? "bg-primary/15 border-primary/30"
                  : filtroUsuario && filtroUsuario !== String(user.id)
                    ? "opacity-30 grayscale hover:opacity-100 hover:grayscale-0"
                    : "hover:bg-secondary/40 border-transparent"
              } border`}
            >
              <div 
                className={`w-1.5 h-5 rounded-full transition-transform duration-300 group-hover:scale-y-125 ${filtroUsuario === String(user.id) ? 'scale-y-125' : ''}`}
                style={{ backgroundColor: getUserColor(user) }}
              />
              <div className="flex flex-col items-start min-w-0 leading-tight">
                <span className="text-foreground font-medium truncate w-full text-[11px]">{user.full_name || user.fullName || user.username}</span>
                <span className="font-mono text-[8px] text-muted-foreground/60 uppercase">ID: {user.id}</span>
              </div>
              
              {filtroUsuario === String(user.id) && (
                <div className="ml-auto w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />
              )}
            </button>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-border/20 space-y-2">
        {vagoUsers.length > 0 && (
          <button
            onClick={onToggleVagos}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 ${
              mostrarVagos
                ? "bg-destructive/15 border-destructive/30 text-destructive"
                : "bg-muted/20 border-transparent hover:bg-muted/40"
            } border`}
          >
            <div className="w-5 h-5 rounded-md bg-destructive/10 flex items-center justify-center border border-destructive/15">
              <div 
                className="w-1 h-1 rounded-full border border-dashed animate-spin"
                style={{ borderColor: "hsl(0, 70%, 50%)" }}
              />
            </div>
            <span className="flex-1 text-left text-[10px]">Territórios Vagos</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${mostrarVagos ? 'bg-destructive/20' : 'bg-muted'}`}>
              {vagoUsers.length}
            </span>
          </button>
        )}

        {filtroUsuario && (role === 'admin' || role === 'supervisor') && (
          <button
            onClick={() => onFilterUser(null)}
            className="w-full h-7 text-[9px] font-bold uppercase tracking-tight text-muted-foreground/70 hover:text-primary hover:bg-primary/5 rounded-md transition-all border border-transparent hover:border-primary/15"
          >
            Limpar Filtro
          </button>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.5);
        }
      `}</style>
    </div>
  );
}
