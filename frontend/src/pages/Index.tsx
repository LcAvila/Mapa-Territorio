import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
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
import ClientDetailPanel from "@/components/ClientDetailPanel";

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
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchResultGeo, setSearchResultGeo] = useState<any | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Client selection state
  const [selectedClients, setSelectedClients] = useState<any[]>([]);

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

  const handleAddressSearch = useCallback(async (query: string) => {
    if (!query || query.length < 3) return;
    
    const toastId = toast.loading('Buscando localização...');
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MapaTerritorio-App/1.1' }
      });
      const data = await res.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setFlyToLocation({ 
          center: [parseFloat(lat), parseFloat(lon)], 
          zoom: 16 
        });
        toast.success('Localização encontrada!', { id: toastId });
      } else {
        toast.error('Endereço não encontrado no Brasil', { id: toastId });
      }
    } catch (error) {
      console.error('Error searching address:', error);
      toast.error('Erro ao buscar endereço', { id: toastId });
    }
  }, []);

  const handleSelectSuggestion = useCallback(async (item: any) => {
    setSearchSuggestions([]);
    
    // Don't update searchQuery with the full name to avoid triggering municipality highlights
    // Just keep the search input clean or with the short name, but tell BrazilMap to ignore it if needed
    setSearchQuery(item.display_name.split(',')[0]);
    
    const toastId = toast.loading('Carregando região...');
    try {
      // Fetch full detail with polygon
      const url = `https://nominatim.openstreetmap.org/details?place_id=${item.place_id}&polygon_geojson=1&format=json`;
      const res = await fetch(url, { headers: { 'User-Agent': 'MapaTerritorio-App/1.1' } });
      const data = await res.json();
      
      if (data) {
        setFlyToLocation({
          center: [parseFloat(data.lat), parseFloat(data.lon)],
          zoom: 14
        });
        
        if (data.geometry) {
           setSearchResultGeo(data.geometry);
           toast.success('Região selecionada!', { id: toastId });
        } else {
           setSearchResultGeo(null);
           toast.success('Localização encontrada!', { id: toastId });
        }
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error('Erro ao carregar detalhes', { id: toastId });
    }
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&countrycodes=br`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MapaTerritorio-App/1.1' } });
        const data = await res.json();
        setSearchSuggestions(data);
      } catch (e) {
        console.error("Autocomplete error:", e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-zoom to client when a single one is selected
  useEffect(() => {
    if (selectedClients.length === 1) {
      const client = selectedClients[0];
      setFlyToLocation({
        center: [client.latitude, client.longitude],
        zoom: 17
      });
    }
  }, [selectedClients]);

  // Close suggestions on map click and clear highlights
  const handleMapBackgroundClick = () => {
    setSearchSuggestions([]);
    setSearchResultGeo(null);
    setFlyToLocation(null);
    setSearchQuery("");
    setSelectedClients([]); // Clear client selection
    if (selectedUF) handleSelectUF("");
  };

  const ufInfo = selectedUF ? getUFBySigla(selectedUF) : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <MapHeader
        selectedUF={selectedUF}
        onSelectUF={handleSelectUF}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isAuthenticated={isAuthenticated}
        role={role}
        logout={logout}
        showClientes={showClientes}
        onToggleClientes={() => setShowClientes(!showClientes)}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
        onSearchEnter={handleAddressSearch}
        suggestions={searchSuggestions}
        onSelectSuggestion={handleSelectSuggestion}
      />

      <div className="flex-1 relative overflow-hidden">
        {/* Map */}
        <BrazilMap
          selectedUF={selectedUF}
          modo={modo}
          filtroRepresentante={filtroRepresentante}
          mostrarVagos={mostrarVagos}
          onSelectUF={handleSelectUF}
          onSelectMunicipio={handleSelectMunicipio}
          searchQuery={flyToLocation ? "" : searchQuery} // Disable highlights if we have a flyTo target
          municipioCodeForBairros={municipioCodeForBairros}
          onDeactivateBairros={() => {
            setMunicipioCodeForBairros(null);
            setSelectedMunicipio(null);
          }}
          selectedMunicipioName={selectedMunicipio?.nome}
          showClientes={showClientes}
          showHeatmap={showHeatmap}
          onContextMenuState={handleContextMenuState}
          onContextMenuMunicipio={handleContextMenuMunicipio}
          flyToLocation={flyToLocation}
          searchResultGeo={searchResultGeo}
          selectedClients={selectedClients}
          onSelectClients={setSelectedClients}
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

        {/* Detail panel overlay - right (Municipality) */}
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
              showClientes={showClientes}
              onToggleClientes={() => setShowClientes(!showClientes)}
            />
          </div>
        )}

        {/* Client detail panel - right (floating lower or same area) */}
        <AnimatePresence>
          {selectedClients.length > 0 && (
            <div className={`absolute ${selectedMunicipio ? 'top-[440px]' : 'top-4'} right-4 z-[1001]`}>
              <ClientDetailPanel
                clients={selectedClients}
                onClose={() => setSelectedClients([])}
                onSelectClient={(client) => {
                  setFlyToLocation({
                    center: [client.latitude, client.longitude],
                    zoom: 17
                  });
                }}
              />
            </div>
          )}
        </AnimatePresence>

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
