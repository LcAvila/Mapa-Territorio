import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BrazilMap from "@/components/BrazilMap";
import MapHeader from "@/components/MapHeader";
import MapLegend from "@/components/MapLegend";
import DetailPanel from "@/components/DetailPanel";
import MapContextMenu, { ContextMenuState } from "@/components/MapContextMenu";
import InterestModal from "@/components/InterestModal";
import { getUFBySigla } from "@/data/uf-codes";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedUF, setSelectedUF] = useState<string | null>(null);
  const [modo, setModo] = useState<"planejamento" | "atendimento">("planejamento");
  const [filtroRepresentante, setFiltroRepresentante] = useState<string | null>(null);
  const [mostrarVagos, setMostrarVagos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMunicipio, setSelectedMunicipio] = useState<{ nome: string; uf: string; id?: number } | null>(null);
  const [municipioCodeForBairros, setMunicipioCodeForBairros] = useState<number | null>(null);
  const [showClientes, setShowClientes] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Interest modal state
  const [interestTarget, setInterestTarget] = useState<{ municipio: string; uf: string } | null>(null);

  const handleSelectUF = useCallback((uf: string | null) => {
    setSelectedUF(uf ? uf : null);
    setSelectedMunicipio(null);
    setMunicipioCodeForBairros(null);
  }, []);

  const handleSelectMunicipio = useCallback(async (nome: string, uf: string) => {
    setSelectedMunicipio({ nome, uf });
    
    // Automatically load neighborhoods for the selected municipality
    const ufInfo = getUFBySigla(uf);
    if (!ufInfo) return;
    
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufInfo.codigo}/municipios`);
      if (res.ok) {
        const data: { id: number; nome: string }[] = await res.json();
        const mun = data.find(m => m.nome.toLowerCase() === nome.toLowerCase());
        if (mun) {
          setMunicipioCodeForBairros(mun.id);
          setSelectedMunicipio({ nome, uf, id: mun.id });
        }
      }
    } catch {
      // Failed to load neighborhoods silently
    }
  }, []);

  const handleContextMenuState = useCallback((nome: string, uf: string, x: number, y: number) => {
    setContextMenu({ x, y, type: 'state', nome, uf });
  }, []);

  const handleContextMenuMunicipio = useCallback((nome: string, uf: string, x: number, y: number) => {
    setContextMenu({ x, y, type: 'municipio', nome, uf });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Fetch IBGE municipality code then activate bairros view
  const handleViewBairrosFromMenu = useCallback(async (nome: string, uf: string) => {
    // Ensure UF is selected so the municipio data loads
    handleSelectUF(uf);
    handleSelectMunicipio(nome, uf);
    const ufInfo = getUFBySigla(uf);
    if (!ufInfo) { toast.error('UF não encontrada'); return; }
    toast.loading('Carregando bairros...', { id: 'bairros' });
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufInfo.codigo}/municipios`);
      if (!res.ok) throw new Error();
      const data: { id: number; nome: string }[] = await res.json();
      const mun = data.find(m => m.nome.toLowerCase() === nome.toLowerCase());
      if (mun) {
        setMunicipioCodeForBairros(mun.id);
        toast.success(`Bairros de ${nome} carregados!`, { id: 'bairros' });
      } else {
        toast.error('Município não encontrado no IBGE', { id: 'bairros' });
      }
    } catch {
      toast.error('Erro ao carregar bairros', { id: 'bairros' });
    }
  }, [handleSelectUF, handleSelectMunicipio]);

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
        showClientes={showClientes}
        onToggleClientes={() => setShowClientes(!showClientes)}
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
          onDeactivateBairros={() => {
            setMunicipioCodeForBairros(null);
            setSelectedMunicipio(null);
          }}
          selectedMunicipioName={selectedMunicipio?.nome}
          showClientes={showClientes}
          onContextMenuState={handleContextMenuState}
          onContextMenuMunicipio={handleContextMenuMunicipio}
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
              onDeselectState={() => handleSelectUF(null)}
            />
          </div>
        )}

        {/* Info badge when no UF selected */}
        {!selectedUF && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg px-4 py-3 max-w-[280px]">
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-semibold">Clique em um estado</span>{" "}
              ou use o filtro acima para selecionar uma UF e ver os municípios com seus responsáveis.
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1.5">
              💡 Botão direito em qualquer área para mais opções
            </p>
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <MapContextMenu
          menu={contextMenu}
          onClose={closeContextMenu}
          onSelectState={() => handleSelectUF(contextMenu.uf)}
          onViewDetails={() => {
            if (selectedUF !== contextMenu.uf) handleSelectUF(contextMenu.uf);
            handleSelectMunicipio(contextMenu.nome, contextMenu.uf);
            toast.success(`Detalhes de ${contextMenu.nome}`, { description: `${contextMenu.uf} — painel aberto à direita` });
          }}
          onViewBairros={() => {
            handleViewBairrosFromMenu(contextMenu.nome, contextMenu.uf);
          }}
          onRegisterInterest={() => setInterestTarget({ municipio: contextMenu.nome, uf: contextMenu.uf })}
          onCopyName={() => {
            navigator.clipboard.writeText(contextMenu.nome);
            toast.success(`"${contextMenu.nome}" copiado!`);
          }}
        />
      )}

      {/* Interest modal */}
      {interestTarget && (
        <InterestModal
          municipio={interestTarget.municipio}
          uf={interestTarget.uf}
          onClose={() => setInterestTarget(null)}
        />
      )}
    </div>
  );
};

export default Index;
