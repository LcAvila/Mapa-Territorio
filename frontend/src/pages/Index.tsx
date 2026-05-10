import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context-core";
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
import RoutingPanel from "@/components/RoutingPanel";
import { useApiUsers, useApiClientes, useApiTerritories, Cliente, SearchSuggestion, GeoJSONFeature, SystemUser } from "@/hooks/use-api-data";
import { RouteWaypoint } from "@/hooks/use-routing";

const Index = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedUF, setSelectedUF] = useState<string | null>(null);
  const [filtroUsuario, setFiltroUsuario] = useState<string | null>(null);
  const [modo, setModo] = useState<"planejamento" | "atendimento">("atendimento");
  const [mostrarVagos, setMostrarVagos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMunicipio, setSelectedMunicipio] = useState<{ nome: string; uf: string; id?: number } | null>(null);
  const [municipioCodeForBairros, setMunicipioCodeForBairros] = useState<number | null>(null);
  const [showClientes, setShowClientes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<{ center: [number, number]; zoom: number } | null>(null);
  
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchResultGeo, setSearchResultGeo] = useState<GeoJSONFeature | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Client selection state
  const [selectedClients, setSelectedClients] = useState<Cliente[]>([]);

  // Routing state
  const [showRouting, setShowRouting] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState<RouteWaypoint[]>([]);

  // Interest modal state
  const [interestTarget, setInterestTarget] = useState<{ municipio: string; uf: string } | null>(null);

  const normalizeCityName = useCallback(
    (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(),
    []
  );

  const handleSelectUF = useCallback((uf: string | null) => {
    setSelectedUF(uf);
    setSelectedMunicipio(null);
    setMunicipioCodeForBairros(null); // Clear neighborhoods on UF change
    if (uf === null) {
      setFiltroUsuario(null);
    }
  }, []);

  const handleSelectMunicipio = useCallback(async (nome: string, uf: string, ibgeCode?: number) => {
    setSelectedMunicipio({ nome, uf, id: ibgeCode });
    // Reset neighborhood view when switching municipalities to prevent cross-loading
    if (municipioCodeForBairros && municipioCodeForBairros !== ibgeCode) {
      setMunicipioCodeForBairros(null);
    }

    // Auto-activate bairros when municipality is clicked.
    if (ibgeCode) {
      setMunicipioCodeForBairros(ibgeCode);
      return;
    }

    // Fallback by name if code is unavailable.
    const ufInfo = getUFBySigla(uf);
    if (!ufInfo) return;
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufInfo.codigo}/municipios`);
      if (!res.ok) return;
      const data: { id: number; nome: string }[] = await res.json();
      const targetName = normalizeCityName(nome);
      const mun = data.find(m => normalizeCityName(m.nome) === targetName);
      if (mun) {
        setSelectedMunicipio({ nome, uf, id: mun.id });
        setMunicipioCodeForBairros(mun.id);
      }
    } catch {
      // Ignore fallback errors silently.
    }
  }, [normalizeCityName]);

  const handleContextMenuState = useCallback((nome: string, uf: string, x: number, y: number) => {
    setContextMenu({ x, y, type: 'state', nome, uf });
  }, []);

  const handleContextMenuMunicipio = useCallback((nome: string, uf: string, x: number, y: number) => {
    setContextMenu({ x, y, type: 'municipio', nome, uf });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Fetch IBGE municipality code then activate bairros view
  const handleViewBairrosFromMenu = useCallback(async (nome: string, uf: string) => {
    // Ensure UF is selected so the municipality data loads
    handleSelectUF(uf);
    handleSelectMunicipio(nome, uf);
    const ufInfo = getUFBySigla(uf);
    if (!ufInfo) { toast.error('UF não encontrada'); return; }
    toast.loading('Carregando bairros...', { id: 'bairros' });
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufInfo.codigo}/municipios`);
      if (!res.ok) throw new Error();
      const data: { id: number; nome: string }[] = await res.json();
      const targetName = normalizeCityName(nome);
      const mun = data.find(m => normalizeCityName(m.nome) === targetName);
      if (mun) {
        setMunicipioCodeForBairros(mun.id);
        toast.success(`Bairros de ${nome} carregados!`, { id: 'bairros' });
      } else {
        toast.error('Município não encontrado no IBGE', { id: 'bairros' });
      }
    } catch {
      toast.error('Erro ao carregar bairros', { id: 'bairros' });
    }
  }, [handleSelectUF, handleSelectMunicipio, normalizeCityName]);

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

  const handleSelectSuggestion = useCallback(async (item: SearchSuggestion) => {
    setSuggestions([]);
    setSearchQuery(item.display_name.split(',')[0]);
    
    // If it's a direct selection from our filters (place_id === 0), don't fetch from nominatim
    if (item.place_id === 0) {
      setFlyToLocation(null); // Let the map handle based on searchQuery or UF
      setSearchResultGeo(null);
      return;
    }

    const toastId = toast.loading('Carregando região...');
    try {
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
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&countrycodes=br`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MapaTerritorio-App/1.1' } });
        const data = await res.json();
        setSuggestions(data);
      } catch (e) {
        console.error("Autocomplete error:", e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { token } = useAuth();
  const { data: apiUsers = [] } = useApiUsers(true);
  const { data: apiTerritories = [] } = useApiTerritories(true);
  const { data: apiClientes = [] } = useApiClientes(filtroUsuario);

  // Auto-zoom to filtered users' clients bounding box
  useEffect(() => {
    if (filtroUsuario) {
      const userIds = filtroUsuario.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
      if (userIds.length === 0) return;

      if (apiClientes.length > 0) {
        // Calculate bounding box of all clients
        let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
        let hasValidCoords = false;

        apiClientes.forEach(c => {
          if (c.latitude && c.longitude) {
            minLat = Math.min(minLat, c.latitude);
            maxLat = Math.max(maxLat, c.latitude);
            minLon = Math.min(minLon, c.longitude);
            maxLon = Math.max(maxLon, c.longitude);
            hasValidCoords = true;
          }
        });

        if (hasValidCoords) {
          const center: [number, number] = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
          
          // Estimate zoom level based on spread
          const latDiff = maxLat - minLat;
          const lonDiff = maxLon - minLon;
          const maxDiff = Math.max(latDiff, lonDiff);
          
          let zoom = 12; // Default zoom for a city
          if (maxDiff > 2) zoom = 6;
          else if (maxDiff > 1) zoom = 8;
          else if (maxDiff > 0.5) zoom = 10;
          else if (maxDiff > 0.1) zoom = 12;
          else zoom = 14;

          setFlyToLocation({ center, zoom });
          
          // Also select the most common UF among clients to show boundaries
          const ufCounts = apiClientes.reduce((acc, c) => {
            if (c.uf) acc[c.uf] = (acc[c.uf] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const sortedUFs = Object.entries(ufCounts).sort((a, b) => b[1] - a[1]);
          if (sortedUFs.length > 0 && sortedUFs[0][0] !== selectedUF) {
            setSelectedUF(sortedUFs[0][0]);
          }
        }
      }
    } else {
      // Reset map when filter is cleared
      setFlyToLocation(null);
      setSearchResultGeo(null);
    }
  }, [filtroUsuario, apiClientes, selectedUF]);

  // Close suggestions on map click and clear highlights
  const handleMapBackgroundClick = () => {
    setSuggestions([]);
    setSearchResultGeo(null);
    setFlyToLocation(null);
    setSearchQuery("");
    setSelectedClients([]); // Clear client selection
    if (selectedUF) handleSelectUF(null);
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
        suggestions={suggestions}
        onSelectSuggestion={handleSelectSuggestion}
        users={apiUsers}
        clients={apiClientes}
        filtroUsuario={filtroUsuario}
        onFilterUser={setFiltroUsuario}
      />

      <main className="flex-1 relative overflow-hidden flex">
        <BrazilMap
          selectedUF={selectedUF}
          modo={modo}
          filtroUsuario={filtroUsuario}
          mostrarVagos={mostrarVagos}
          onSelectUF={handleSelectUF}
          onSelectMunicipio={handleSelectMunicipio}
          searchQuery={searchQuery}
          municipioCodeForBairros={municipioCodeForBairros}
          selectedMunicipioCode={selectedMunicipio?.id}
          selectedMunicipioName={selectedMunicipio?.nome || ""}
          onDeactivateBairros={() => setMunicipioCodeForBairros(null)}
          showClientes={showClientes}
          showHeatmap={showHeatmap}
          flyToLocation={flyToLocation}
          searchResultGeo={searchResultGeo}
          selectedClients={selectedClients}
          onSelectClients={setSelectedClients}
          onResetMap={() => setFlyToLocation({ center: [-14.2, -51.9], zoom: 4 })}
          onZoomToLocation={(center, zoom) => setFlyToLocation({ center, zoom })}
        />

        {/* Legend overlay - bottom left */}
        {selectedUF && (
          <div className="absolute bottom-4 left-4 z-[1000]">
            <MapLegend
              selectedUF={selectedUF}
              modo={modo}
              filtroUsuario={filtroUsuario}
              onFilterUser={setFiltroUsuario}
              mostrarVagos={mostrarVagos}
              onToggleVagos={() => setMostrarVagos(!mostrarVagos)}
              clients={apiClientes}
            />
          </div>
        )}

        {/* Right side floating panels (Side-by-Side Flex Layout) */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-row-reverse items-start gap-4 pointer-events-none overflow-x-auto overflow-y-visible max-w-[calc(100vw-4rem)] p-1 scrollbar-hide">
          
          {/* Detail panel overlay - right (Municipality) */}
          {selectedMunicipio && (
            <div className="w-[320px] pointer-events-auto shrink-0 shadow-xl rounded-lg">
              <DetailPanel
                municipio={selectedMunicipio.nome}
                uf={selectedMunicipio.uf}
                municipioId={selectedMunicipio.id}
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

          {/* Client detail panel */}
          <AnimatePresence>
            {selectedClients.length > 0 && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-[320px] pointer-events-auto shrink-0 shadow-xl rounded-lg"
              >
                <ClientDetailPanel
                  clients={selectedClients}
                  onClose={() => { setSelectedClients([]); setShowRouting(false); setRouteWaypoints([]); }}
                  onSelectClient={(client) => {
                    setFlyToLocation({
                      center: [client.latitude, client.longitude],
                      zoom: 17
                    });
                  }}
                  onZoomToClient={(client) => {
                    setFlyToLocation({
                      center: [client.latitude, client.longitude],
                      zoom: 18
                    });
                  }}
                  onCalculateRoute={() => setShowRouting(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Routing Panel */}
          <AnimatePresence>
            {showRouting && selectedClients.length > 0 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-[320px] pointer-events-auto shrink-0 shadow-xl rounded-lg"
              >
                <RoutingPanel
                  clients={selectedClients}
                  onClose={() => { setShowRouting(false); setRouteWaypoints([]); }}
                  onRouteCalculated={(waypoints) => {
                    setRouteWaypoints(waypoints);
                    toast.success(`Rota calculada! ${waypoints.length} pontos.`);
                  }}
                  onRouteClear={() => setRouteWaypoints([])}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
      </main>

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
