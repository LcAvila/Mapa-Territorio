import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { User, Settings, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrazilMap from "@/components/BrazilMap";
import MapHeader from "@/components/MapHeader";
import MapLegend from "@/components/MapLegend";
import DetailPanel from "@/components/DetailPanel";
import { getUFBySigla } from "@/data/uf-codes";
import { toast } from "sonner";

const Index = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedUF, setSelectedUF] = useState<string | null>(null);
  const [modo, setModo] = useState<"planejamento" | "atendimento">("planejamento");
  const [filtroRepresentante, setFiltroRepresentante] = useState<string | null>(null);
  const [mostrarVagos, setMostrarVagos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMunicipio, setSelectedMunicipio] = useState<{ nome: string; uf: string } | null>(null);
  const [municipioCodeForBairros, setMunicipioCodeForBairros] = useState<number | null>(null);

  const handleSelectUF = useCallback((uf: string | null) => {
    setSelectedUF(uf ? uf : null);
    setSelectedMunicipio(null);
    setMunicipioCodeForBairros(null);
  }, []);

  const handleSelectMunicipio = useCallback((nome: string, uf: string) => {
    setSelectedMunicipio({ nome, uf });
    setMunicipioCodeForBairros(null);
  }, []);

  const ufInfo = selectedUF ? getUFBySigla(selectedUF) : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <MapHeader
        selectedUF={selectedUF}
        onSelectUF={handleSelectUF}
        modo={modo}
        onSetModo={setModo}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isAuthenticated={isAuthenticated}
        role={role}
        logout={logout}
      />

      <div className="flex-1 relative overflow-hidden">
        {/* Map */}
        <BrazilMap
          selectedUF={selectedUF}
          modo={modo}
          filtroRepresentante={filtroRepresentante}
          mostrarVagos={mostrarVagos}
          onSelectUF={(uf) => handleSelectUF(uf)}
          onSelectMunicipio={handleSelectMunicipio}
          searchQuery={searchQuery}
          municipioCodeForBairros={municipioCodeForBairros}
          onDeactivateBairros={() => setMunicipioCodeForBairros(null)}
        />

        {/* Legend overlay - bottom left */}
        {selectedUF && (
          <div className="absolute bottom-4 left-4 z-[1000]">
            <MapLegend
              modo={modo}
              filtroRepresentante={filtroRepresentante}
              onFilterRep={setFiltroRepresentante}
              mostrarVagos={mostrarVagos}
              onToggleVagos={() => setMostrarVagos(!mostrarVagos)}
            />
          </div>
        )}

        {/* Detail panel overlay - right */}
        {selectedMunicipio && (
          <div className="absolute top-4 right-4 z-[1000] w-[320px]">
            <DetailPanel
              municipio={selectedMunicipio.nome}
              uf={selectedMunicipio.uf}
              modo={modo}
              onClose={() => setSelectedMunicipio(null)}
              onViewBairros={setMunicipioCodeForBairros}
              ufCode={ufInfo?.codigo}
              isBairrosActive={!!municipioCodeForBairros}
            />
          </div>
        )}

        {/* Info badge when no UF selected */}
        {!selectedUF && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg px-4 py-3 max-w-[280px]">
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-semibold">Clique em um estado</span> ou use o filtro acima para selecionar uma UF e ver os municípios com seus responsáveis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
