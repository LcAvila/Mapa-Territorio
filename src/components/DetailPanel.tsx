import { X, Map as MapIcon, Loader2, RotateCcw } from "lucide-react";
import { getMunicipioResponsaveis, hasBairros, getBairroResponsaveis, allBairros } from "@/data/territories";
import { getRepByCode, getRepColor } from "@/data/representatives";
import { useMunicipioInfo } from "@/hooks/use-geo-data";

interface DetailPanelProps {
  municipio: string;
  uf: string;
  modo: "planejamento" | "atendimento";
  onClose: () => void;
  onViewBairros?: (code: number | null) => void;
  ufCode?: number;
  isBairrosActive?: boolean;
}

export default function DetailPanel({ municipio, uf, modo, onClose, onViewBairros, ufCode, isBairrosActive }: DetailPanelProps) {
  const { data: municipiosInfo, isLoading: loadingInfo } = useMunicipioInfo(ufCode || null);
  const reps = getMunicipioResponsaveis(municipio, uf, modo);

  const handleViewBairros = () => {
    if (!onViewBairros || !municipiosInfo) return;

    if (isBairrosActive) {
      onViewBairros(null);
      return;
    }

    // Find municipality code by name
    const mun = municipiosInfo.find(
      (m: any) => m.nome.toLowerCase() === municipio.toLowerCase()
    );

    if (mun) {
      onViewBairros(mun.id);
    }
  };
  const temBairros = hasBairros(municipio, uf);

  // Get bairros for this municipality in the current mode
  const bairros = allBairros.filter(
    b => b.municipio.toLowerCase() === municipio.toLowerCase() &&
      b.uf === uf &&
      b.modo === modo
  );

  // Group bairros by name
  const bairroMap = new Map<string, string[]>();
  bairros.forEach(b => {
    const existing = bairroMap.get(b.bairro) || [];
    existing.push(b.repCode);
    bairroMap.set(b.bairro, existing);
  });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between"
        style={{ background: "var(--gradient-header)" }}>
        <div>
          <h2 className="font-semibold text-foreground">{municipio}</h2>
          <p className="text-xs text-muted-foreground">{uf} · {modo === "planejamento" ? "Planejamento" : "Atendimento"}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Responsáveis */}
      <div className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {modo === "planejamento" ? "Responsável Principal" : "Responsáveis"}
        </h3>

        {reps.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sem responsável atribuído</p>
        ) : (
          <div className="space-y-2">
            {reps.map((code, i) => {
              const rep = getRepByCode(code);
              if (!rep) return null;
              return (
                <div key={`${code}-${i}`} className="flex items-center gap-3 p-2 rounded-md bg-secondary/50">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{
                      backgroundColor: getRepColor(rep),
                      border: rep.isVago ? "2px dashed hsl(0, 70%, 50%)" : "none"
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{rep.code} - {rep.name}</p>
                    {rep.isVago && (
                      <span className="text-[10px] text-destructive font-medium uppercase">VAGO</span>
                    )}
                    {i === 0 && modo === "atendimento" && reps.length > 1 && (
                      <span className="text-[10px] text-primary font-medium ml-2">PRINCIPAL</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bairros section */}
        {temBairros && bairroMap.size > 0 && (
          <div className="border-t border-border pt-3 mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Bairros ({bairroMap.size})
            </h3>
            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
              {Array.from(bairroMap.entries()).map(([bairro, codes]) => {
                const mainRep = getRepByCode(codes[0]);
                return (
                  <div key={bairro} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs hover:bg-secondary/50 transition-colors">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: mainRep ? getRepColor(mainRep) : "hsl(0,0%,50%)" }}
                    />
                    <span className="text-foreground flex-1">{bairro}</span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {codes.length > 1 ? `${codes.length} reps` : codes[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {temBairros && bairroMap.size === 0 && (
          <div className="border-t border-border pt-3 mt-3">
            <p className="text-xs text-muted-foreground italic">
              Bairros cadastrados neste município. Selecione modo correto para ver.
            </p>
          </div>
        )}

        {/* Global/IBGE Bairros Visualization Button */}
        <div className="border-t border-border pt-4 mt-2">
          <button
            onClick={handleViewBairros}
            disabled={loadingInfo || !onViewBairros}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isBairrosActive
              ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
          >
            {loadingInfo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isBairrosActive ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <MapIcon className="w-4 h-4" />
            )}
            {isBairrosActive ? "Esconder Bairros no Mapa" : "Visualizar Bairros no Mapa"}
          </button>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {isBairrosActive
              ? "Divisões municipais (subdistritos/bairros) ativas."
              : "* Carrega os limites geográficos (subdistritos) do IBGE para este município."}
          </p>
        </div>
      </div>
    </div>
  );
}
