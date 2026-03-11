import { X, Map as MapIcon, Loader2, RotateCcw } from "lucide-react";
import { getRepColor, getRepByCode } from "@/data/representatives";
import { getMunicipioResponsaveis } from "@/data/territories";
import { useMunicipioInfo } from "@/hooks/use-geo-data";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { Representative } from "@/data/representatives";
import type { TerritoryAssignment } from "@/data/territories";

interface DetailPanelProps {
  municipio: string;
  uf: string;
  modo: "planejamento" | "atendimento";
  onClose: () => void;
  onViewBairros?: (code: number | null) => void;
  ufCode?: number;
  isBairrosActive?: boolean;
  onDeselectState?: () => void;
}

function useApiData() {
  const repsQ = useQuery<Representative[]>({
    queryKey: ["api", "representatives"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/representatives");
      return res.ok ? res.json() : [];
    },
    staleTime: 30_000,
  });

  const terrQ = useQuery<TerritoryAssignment[]>({
    queryKey: ["api", "territories"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/territories");
      return res.ok ? res.json() : [];
    },
    staleTime: 30_000,
  });

  return { reps: repsQ.data || [], territories: terrQ.data || [] };
}

export default function DetailPanel({ municipio, uf, modo, onClose, onViewBairros, ufCode, isBairrosActive, onDeselectState }: DetailPanelProps) {
  const { role, estado_end } = useAuth();
  const { data: municipiosInfo, isLoading: loadingInfo } = useMunicipioInfo(ufCode || null);
  const { reps: apiReps, territories: apiTerritories } = useApiData();

  const repCodes = getMunicipioResponsaveis(municipio, uf, modo, apiTerritories);

  const handleViewBairros = () => {
    if (!onViewBairros || !municipiosInfo) return;
    if (isBairrosActive) { onViewBairros(null); return; }
    const mun = municipiosInfo.find((m: any) => m.nome.toLowerCase() === municipio.toLowerCase());
    if (mun) onViewBairros(mun.id);
  };

  return (
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

        {repCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sem responsável atribuído</p>
        ) : (role === "user" && estado_end && uf !== estado_end) ? (
          <div className="space-y-2">
            {repCodes.some(code => getRepByCode(code, apiReps)?.isVago) ? (
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
            {repCodes.map((code, i) => {
              const rep = getRepByCode(code, apiReps);
              if (!rep) return (
                <div key={`${code}-${i}`} className="flex items-center gap-3 p-2 rounded-md bg-secondary/50">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-muted" />
                  <p className="text-sm font-medium text-foreground">{code}</p>
                </div>
              );
              return (
                <div key={`${code}-${i}`} className="flex items-center gap-3 p-2 rounded-md bg-secondary/50">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: getRepColor(rep), border: rep.isVago ? "2px dashed hsl(0, 70%, 50%)" : "none" }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{rep.code} - {rep.name}</p>
                    {rep.isVago && <span className="text-[10px] text-destructive font-medium uppercase">VAGO</span>}
                    {i === 0 && modo === "atendimento" && repCodes.length > 1 && (
                      <span className="text-[10px] text-primary font-medium ml-2">PRINCIPAL</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bairros Visualization */}
        <div className="border-t border-border pt-4 mt-2">
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
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {isBairrosActive ? "Divisões municipais ativas." : "* Carrega os limites geográficos (IBGE) para este município."}
          </p>
        </div>
      </div>
    </div>
  );
}
