import { useApiRepresentatives, useApiTerritories, Cliente } from "@/hooks/use-api-data";
import { getRepColor } from "@/data/representatives";
import { useAuth } from "@/contexts/AuthContext";
import { Users, FilterX, MapPin } from "lucide-react";

interface MapLegendProps {
  selectedUF: string | null;
  modo: "planejamento" | "atendimento";
  filtroRepresentante: string | null;
  onFilterRep: (code: string | null) => void;
  clients: Cliente[];
  mostrarVagos: boolean;
  onToggleVagos: () => void;
}

export default function MapLegend({
  selectedUF,
  modo,
  filtroRepresentante,
  onFilterRep,
  mostrarVagos,
  onToggleVagos,
  clients,
}: MapLegendProps) {
  const { token } = useAuth();
  const { data: representatives = [] } = useApiRepresentatives(!!token);

  // Get the set of repCodes that have clients in the selected UF
  const repCodesInUF = selectedUF
    ? new Set(clients.filter(c => c.uf === selectedUF && c.repCode).map(c => c.repCode!))
    : null;

  // Filter reps: if a UF is selected, show only those who have clients there
  const relevantReps = representatives.filter(rep => {
    if (!repCodesInUF) return true;
    return repCodesInUF.has(rep.code);
  });

  const activeReps = relevantReps.filter(r => !r.isVago);
  const vagoReps = relevantReps.filter(r => r.isVago);

  return (
    <div className="bg-card/90 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-4 w-[280px] shadow-2xl ring-1 ring-white/10">
      <div className="flex items-center justify-between pb-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20">
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">
              {selectedUF ? `Equipe ${selectedUF}` : "Representantes"}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
           <MapPin className="w-3 h-3 text-muted-foreground" />
           <span className="text-[10px] font-medium text-muted-foreground uppercase">
             {selectedUF || "Brasil"}
           </span>
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto pr-1 custom-scrollbar space-y-1.5">
        {activeReps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center space-y-2 opacity-60">
             <FilterX className="w-8 h-8 text-muted-foreground/30" />
             <p className="text-[11px] text-muted-foreground italic">
               Nenhum responsável {selectedUF ? `em ${selectedUF}` : "cadastrado"}
             </p>
          </div>
        ) : (
          activeReps.map((rep) => (
            <button
              key={rep.code}
              onClick={() => onFilterRep(filtroRepresentante === rep.code ? null : rep.code)}
              className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all duration-300 relative overflow-hidden ${
                filtroRepresentante === rep.code
                  ? "bg-primary/20 border-primary/40 shadow-inner"
                  : filtroRepresentante && filtroRepresentante !== rep.code
                    ? "opacity-30 grayscale hover:opacity-100 hover:grayscale-0"
                    : "hover:bg-secondary/50 border-transparent"
              } border`}
            >
              <div 
                className={`w-2 h-7 rounded-sm transition-transform duration-500 group-hover:scale-y-110 ${filtroRepresentante === rep.code ? 'scale-y-110' : ''}`}
                style={{ backgroundColor: getRepColor(rep) }}
              />
              <div className="flex flex-col items-start min-w-0">
                <span className="font-mono text-[9px] text-muted-foreground/70 leading-none mb-1">COD: {rep.code}</span>
                <span className="text-foreground font-semibold truncate w-full">{rep.name}</span>
              </div>
              
              {filtroRepresentante === rep.code && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
              )}
            </button>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-border/30 space-y-3">
        {vagoReps.length > 0 && (
          <button
            onClick={onToggleVagos}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all duration-300 ${
              mostrarVagos
                ? "bg-destructive/20 border-destructive/40 text-destructive shadow-inner"
                : "bg-muted/30 border-transparent hover:bg-muted/50"
            } border`}
          >
            <div className="w-6 h-6 rounded-lg bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <div 
                className="w-1.5 h-1.5 rounded-full border border-dashed animate-spin"
                style={{ borderColor: "hsl(0, 70%, 50%)" }}
              />
            </div>
            <span className="flex-1 text-left">Mostrar Territórios Vagos</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] ${mostrarVagos ? 'bg-destructive/20' : 'bg-muted'}`}>
              {vagoReps.length}
            </span>
          </button>
        )}

        {filtroRepresentante && (
          <button
            onClick={() => onFilterRep(null)}
            className="w-full h-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all border border-transparent hover:border-primary/20"
          >
            Limpar Filtro de Seleção
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
