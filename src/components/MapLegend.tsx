import { representatives, getRepColor, Representative } from "@/data/representatives";

interface MapLegendProps {
  modo: "planejamento" | "atendimento";
  filtroRepresentante: string | null;
  onFilterRep: (code: string | null) => void;
  mostrarVagos: boolean;
  onToggleVagos: () => void;
}

export default function MapLegend({
  modo,
  filtroRepresentante,
  onFilterRep,
  mostrarVagos,
  onToggleVagos,
}: MapLegendProps) {
  const activeReps = representatives.filter(r => !r.isVago);
  const vagoReps = representatives.filter(r => r.isVago);

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-3 max-w-[260px]">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Legenda
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {modo === "planejamento" ? "Planejamento" : "Atendimento"}
        </span>
      </div>

      <div className="space-y-1">
        {activeReps.map((rep) => (
          <button
            key={rep.code}
            onClick={() => onFilterRep(filtroRepresentante === rep.code ? null : rep.code)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${
              filtroRepresentante === rep.code
                ? "bg-secondary ring-1 ring-primary"
                : filtroRepresentante && filtroRepresentante !== rep.code
                ? "opacity-40"
                : "hover:bg-secondary/50"
            }`}
          >
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: getRepColor(rep) }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">{rep.code}</span>
            <span className="text-foreground truncate">{rep.name}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-border pt-2">
        <button
          onClick={onToggleVagos}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${
            mostrarVagos
              ? "bg-destructive/10 ring-1 ring-destructive text-destructive"
              : "hover:bg-secondary/50"
          }`}
        >
          <span
            className="w-3 h-3 rounded-sm flex-shrink-0 border-2 border-dashed"
            style={{ 
              backgroundColor: "hsl(0, 0%, 30%)", 
              borderColor: "hsl(0, 70%, 50%)" 
            }}
          />
          <span className="text-foreground">Mostrar VAGOS</span>
          {vagoReps.length > 0 && (
            <span className="ml-auto text-muted-foreground">({vagoReps.length})</span>
          )}
        </button>
      </div>

      {filtroRepresentante && (
        <button
          onClick={() => onFilterRep(null)}
          className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Limpar filtro
        </button>
      )}
    </div>
  );
}
