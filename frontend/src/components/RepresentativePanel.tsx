import { motion } from "framer-motion";
import { X, MapPin, Users, UserCheck } from "lucide-react";
import { getRepColor } from "@/data/representatives";
import { Representative, Cliente, TerritoryAssignment } from "@/hooks/use-api-data";
import { useMemo, useState } from "react";

interface RepresentativePanelProps {
  reps: Representative[];
  clients: Cliente[];
  territories: TerritoryAssignment[];
  selectedRep: string | null;
  onSelectRep: (code: string | null) => void;
  onClose: () => void;
  onZoomToRep: (rep: Representative) => void;
}

export default function RepresentativePanel({
  reps, clients, territories, selectedRep, onSelectRep, onClose, onZoomToRep
}: RepresentativePanelProps) {
  const [query, setQuery] = useState("");

  const activeReps = useMemo(() =>
    reps.filter(r => !r.isVago).sort((a, b) => a.name.localeCompare(b.name)),
    [reps]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return activeReps.filter(r =>
      r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
    );
  }, [activeReps, query]);

  const clientCountByRep = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      if (c.repCode) counts[c.repCode] = (counts[c.repCode] || 0) + 1;
    });
    return counts;
  }, [clients]);

  const ufsByRep = useMemo(() => {
    const ufs: Record<string, Set<string>> = {};
    territories.forEach(t => {
      if (!ufs[t.repCode]) ufs[t.repCode] = new Set();
      ufs[t.repCode].add(t.uf);
    });
    return ufs;
  }, [territories]);

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="w-[280px] bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-gradient-to-r from-emerald-900/30 to-transparent">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="font-semibold text-sm text-foreground">Representantes</h2>
          <span className="text-[10px] bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-1.5 py-0.5 rounded-full font-bold">
            {activeReps.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selectedRep && (
            <button
              onClick={() => onSelectRep(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary transition-colors"
            >
              Limpar filtro
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border/50">
        <input
          type="text"
          placeholder="Buscar representante..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-secondary text-foreground text-xs px-3 py-1.5 rounded-md border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {/* Rep List */}
      <div className="overflow-y-auto flex-1 py-1">
        {filtered.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">Nenhum resultado</p>
        )}
        {filtered.map(rep => {
          const color = getRepColor(rep);
          const count = clientCountByRep[rep.code] || 0;
          const ufs = ufsByRep[rep.code] ? Array.from(ufsByRep[rep.code]).join(", ") : "—";
          const isActive = selectedRep === rep.code;

          return (
            <button
              key={rep.code}
              onClick={() => {
                onSelectRep(isActive ? null : rep.code);
                if (!isActive) onZoomToRep(rep);
              }}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all border-b border-border/30 last:border-0 ${
                isActive
                  ? "bg-emerald-600/10 border-l-2 border-l-emerald-500"
                  : "hover:bg-secondary/60"
              }`}
            >
              {/* Color swatch */}
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0 border"
                style={{ backgroundColor: color, borderColor: color }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{rep.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono">{rep.code}</span>
                  {ufs !== "—" && (
                    <span className="text-[9px] text-muted-foreground/70 flex items-center gap-0.5">
                      <MapPin className="w-2 h-2" />{ufs}
                    </span>
                  )}
                </div>
              </div>

              {/* Client count */}
              {count > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <Users className="w-2.5 h-2.5" />
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-border/50 text-[10px] text-muted-foreground text-center">
        Clique num representante para filtrar o mapa
      </div>
    </motion.div>
  );
}
