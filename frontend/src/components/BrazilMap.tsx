import { RotateCcw, Loader, Layers, Wind } from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import {
  MapContainer, TileLayer, GeoJSON, useMap,
  AttributionControl, CircleMarker, Tooltip as LeafletTooltip, Pane
} from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { booleanPointInPolygon, point as turfPoint } from "@turf/turf";
import { toast } from "sonner";
import {
  useStatesGeoJSON, useMunicipiosGeoJSON, useMunicipioNames,
  useNeighborhoodsGeoJSON, useStatesMetadata, useCitiesMetadata
} from "@/hooks/use-geo-data";
import { useAuth } from "@/contexts/auth-context-core";
import { getUFByCode, getUFBySigla } from "@/data/uf-codes";
import { getMunicipioResponsaveis } from "@/data/territories";
import { getUserColor, getUserById } from "@/data/representatives";
import { useApiUsers, useApiTerritories, useApiClientes, SystemUser, TerritoryAssignment, Cliente, GeoJSONFeatureCollection, GeoJSONFeature, SearchSuggestion } from "@/hooks/use-api-data";
import { API_BASE_URL } from "@/lib/api-base";
import { buildAssignedStates } from "@/lib/user-territory";

interface BrazilMapProps {
  selectedUF: string | null;
  modo: "planejamento" | "atendimento";
  filtroUsuario: string | null;
  assignedStates?: string[];
  mostrarVagos: boolean;
  onSelectUF: (uf: string) => void;
  onSearchEnter?: (q: string) => void;
  suggestions?: SearchSuggestion[];
  onSelectSuggestion?: (item: SearchSuggestion) => void;
  onSelectMunicipio: (municipio: string, uf: string, ibgeCode?: number) => void;
  searchQuery: string;
  municipioCodeForBairros?: number | null;
  selectedMunicipioCode?: number | null;
  onDeactivateBairros?: () => void;
  selectedMunicipioName?: string | null;
  showClientes: boolean;
  showHeatmap: boolean;
  showUsuarios?: boolean;
  onContextMenuState?: (nome: string, uf: string, x: number, y: number) => void;
  onContextMenuMunicipio?: (nome: string, uf: string, x: number, y: number) => void;
  flyToLocation?: { center: [number, number]; zoom: number } | null;
  searchResultGeo?: GeoJSONFeatureCollection | GeoJSONFeature | null;
  selectedClients?: Cliente[];
  onSelectClients?: (clients: Cliente[]) => void;
  onResetMap?: () => void;
  onZoomToLocation?: (center: [number, number], zoom: number) => void;
}

const API_BASE = API_BASE_URL;

function MapController({ center, zoom, flyToLocation, selectedUF }: { center: [number, number]; zoom: number; flyToLocation?: { center: [number, number]; zoom: number } | null; selectedUF: string | null }) {
  const map = useMap();
  const isFirst = useRef(true);

  const centerLat = center[0];
  const centerLng = center[1];
  const hasFlyTo = !!flyToLocation;

  // Lógica de animação baseada em estado (UF ou visão Brasil)
  useEffect(() => {
    if (!map) return;
    // SÓ executamos se não estivemos num foco de cliente (flyToLocation)
    // E se não estivermos já num nível de zoom detalhado (evita resetar zoom manual)
    if (!hasFlyTo && map.getZoom() < 8) {
      if (selectedUF || isFirst.current) {
        map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
        isFirst.current = false;
      }
    }
  }, [map, center, zoom, hasFlyTo, selectedUF]);

  // Handle manual address search navigation
  useEffect(() => {
    if (map && flyToLocation && flyToLocation.center) {
      const [lat, lon] = flyToLocation.center;
      if (!isNaN(lat) && !isNaN(lon)) {
        // Use a small timeout to ensure map is ready and not fighting other animations
        const timer = setTimeout(() => {
          try {
            map.flyTo([lat, lon], flyToLocation.zoom || 14, {
              duration: 2.5,
              easeLinearity: 0.1
            });
          } catch (e) {
            map.setView([lat, lon], flyToLocation.zoom || 14);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [map, flyToLocation]);

  return null;
}

// ─── Map move handler for animation effects ──────────────────────────────────
function MapAnimationController({ onMoveStart, onMoveEnd }: { onMoveStart: () => void; onMoveEnd: () => void }) {
  const map = useMap();
  useEffect(() => {
    map.on("movestart", onMoveStart);
    map.on("moveend", onMoveEnd);
    return () => {
      map.off("movestart", onMoveStart);
      map.off("moveend", onMoveEnd);
    };
  }, [map, onMoveStart, onMoveEnd]);
  return null;
}

// ─── Map Context Menu component ──────────────────────────────────────────────
function MapContextActions({
  clientContextMenu,
  onClose,
  onSelectClients,
  onZoomToLocation
}: {
  clientContextMenu: { client: Cliente; x: number; y: number } | null;
  onClose: () => void;
  onSelectClients?: (clients: Cliente[]) => void;
  onZoomToLocation?: (center: [number, number], zoom: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    // If maps clicks happen, close menu
    const close = () => onClose();
    map.on('click', close);
    map.on('zoomstart', close);
    map.on('movestart', close);
    return () => {
      map.off('click', close);
      map.off('zoomstart', close);
      map.off('movestart', close);
    };
  }, [map, onClose]);

  if (!clientContextMenu) return null;

  // Make sure it doesn't fall off the screen
  const x = Math.min(clientContextMenu.x, window.innerWidth - 200);
  const y = Math.min(clientContextMenu.y, window.innerHeight - 150);

  return (
    <div
      className="fixed z-[99999] bg-card border border-border shadow-2xl rounded-lg overflow-hidden w-48 pointer-events-auto"
      style={{ left: x, top: y }}
      onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); L.DomEvent.stopPropagation(e.nativeEvent); }}
      onClick={(e: React.MouseEvent) => { L.DomEvent.stopPropagation(e.nativeEvent); }}
    >
      <div className="bg-primary/5 px-3 py-2 border-b border-border/50">
        <p className="text-[11px] font-bold text-primary truncate">
          {clientContextMenu.client.nome_cliente}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          const { latitude, longitude } = clientContextMenu.client;
          if (latitude !== undefined && longitude !== undefined) {
             const target: [number, number] = [Number(latitude), Number(longitude)];
             onZoomToLocation?.(target, 18);
             onClose();
          }
        }}
        className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-secondary transition-colors border-b border-border/50"
      >
        Aproximar Cliente
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectClients) onSelectClients([clientContextMenu.client]);
          onClose();
        }}
        className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-secondary transition-colors border-b border-border/50"
      >
        Ver Detalhes
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="w-full text-left px-3 py-2 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}

// ─── Map event handler for global clicks (deselect on background click) ────
function MapEventHandler({ onBackgroundClick, onBackgroundDblClick }: { onBackgroundClick: () => void; onBackgroundDblClick: () => void }) {
  const map = useMap();
  useEffect(() => {
    map.on("click", (e) => {
      // Small delay to allow click vs dblclick distinction if needed, 
      // but here we just pass it through
      onBackgroundClick();
    });
    map.on("dblclick", (e) => {
      L.DomEvent.stopPropagation(e);
      onBackgroundDblClick();
    });
    return () => {
      map.off("click", onBackgroundClick);
      map.off("dblclick", onBackgroundDblClick);
    };
  }, [map, onBackgroundClick, onBackgroundDblClick]);
  return null;
}

// ─── Auto-zoom helper component ──────────────────────────────────────────────
function ZoomToFeature({ 
  geoJson, 
  maxZoom = 13,
  skipIfZoomed = false
}: { 
  geoJson: GeoJSONFeature | GeoJSONFeatureCollection; 
  maxZoom?: number;
  skipIfZoomed?: boolean;
}) {
  const map = useMap();
  const lastGeoJsonRef = useRef<string>("");

  useEffect(() => {
    if (!geoJson || !map) return;
    
    try {
      const geoJsonStr = JSON.stringify(geoJson);
      if (geoJsonStr === lastGeoJsonRef.current) return;
      lastGeoJsonRef.current = geoJsonStr;

      // Se já estivermos com zoom detalhado e o skipIfZoomed for true, não re-foca
      if (skipIfZoomed && map.getZoom() >= 11) return;

      const layer = L.geoJSON(geoJson as Parameters<typeof L.geoJSON>[0]);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.flyToBounds(bounds, {
          padding: [50, 50],
          duration: 2.0,
          easeLinearity: 0.5,
          maxZoom: maxZoom
        });
        // Ensure map is correctly aligned after transition
        setTimeout(() => map.invalidateSize(), 2100);
      }
    } catch { /* ignore */ }
  }, [geoJson, map, maxZoom, skipIfZoomed]);
  return null;
}

// ─── Heatmap Layout component ──────────────────────────────────────────────
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const heatLayer = (L as unknown as { heatLayer: (pts: [number, number, number][], options: unknown) => L.Layer }).heatLayer(points, {
      radius: 20,
      blur: 15,
      maxZoom: 10,
      minOpacity: 0.4,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map);
    return () => { map.removeLayer(heatLayer); };
  }, [map, points]);
  return null;
}



// ─── Wind Animation Overlay ──────────────────────────────────────────────────
function WindZoomAnimation() {
  const map = useMap();
  const [zoomType, setZoomType] = useState<'in' | 'out' | null>(null);
  const lastZoomRef = useRef(map.getZoom());

  useEffect(() => {
    // zoomstart é disparado no INÍCIO da animação do Leaflet
    const handleZoomStart = () => {
      // Infelizmente o Leaflet não nos dá o zoom de destino no zoomstart facilmente.
      // Mas para flyTo e flyToBounds (zoom automático), podemos detectar a intenção.
      // Como alternativa robusta, vamos escutar 'zoomstart' e tentar inferir 
      // ou apenas disparar a animação visual que dura o tempo do flyTo.
      
      // Para fins de animação durante o zoom, o ideal é detectar a mudança de zoom 
      // assim que ela começa.
      const currentZoom = map.getZoom();
      
      // Como o zoomstart acontece ANTES da mudança, usamos um pequeno hack:
      // Se o mapa está animando (flyTo), o zoom final será diferente.
      // Para simplificar e garantir que aconteça DURANTE, vamos usar 'zoomstart'.
      // Mas para saber se é IN ou OUT no início, precisamos de uma referência externa.
      
      // Melhor abordagem: Escutar 'movestart' e checar se há animação de zoom.
    };

    const handleZoomAnim = (e: L.LeafletEvent) => {
      const zoomEvent = e as any;
      if (zoomEvent.zoom > lastZoomRef.current) {
        setZoomType('in');
      } else if (zoomEvent.zoom < lastZoomRef.current) {
        setZoomType('out');
      }
      lastZoomRef.current = zoomEvent.zoom;
      
      const timer = setTimeout(() => setZoomType(null), 1200);
      return () => clearTimeout(timer);
    };

    // 'zoomanim' é disparado frame a frame durante o flyTo/zoom animado
    map.on('zoomanim', handleZoomAnim);
    
    return () => {
      map.off('zoomanim', handleZoomAnim);
    };
  }, [map]);

  return (
    <AnimatePresence>
      {zoomType && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-[10000] flex items-center justify-center overflow-hidden"
        >
          {/* Create multiple wind lines */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={zoomType === 'in' ? { 
                scale: 0.5, 
                opacity: 0,
                x: (Math.random() - 0.5) * 200,
                y: (Math.random() - 0.5) * 200,
                rotate: Math.random() * 360
              } : { 
                scale: 2, 
                opacity: 0,
                x: (Math.random() - 0.5) * 1000,
                y: (Math.random() - 0.5) * 1000,
                rotate: Math.random() * 360
              }}
              animate={{ 
                scale: zoomType === 'in' ? 3 : 0.2,
                opacity: [0, 0.5, 0],
                x: zoomType === 'in' ? (Math.random() - 0.5) * 2000 : 0,
                y: zoomType === 'in' ? (Math.random() - 0.5) * 2000 : 0,
              }}
              transition={{ 
                duration: 0.8, 
                ease: "easeOut",
                delay: Math.random() * 0.2 
              }}
              className="absolute"
            >
              <Wind 
                size={40 + Math.random() * 60} 
                className="text-primary/30 blur-[1px]" 
                strokeWidth={1}
              />
            </motion.div>
          ))}
          
          {/* Radial "Speed Lines" effect */}
          <motion.div 
            initial={{ scale: zoomType === 'in' ? 0.8 : 1.2, opacity: 0 }}
            animate={{ scale: zoomType === 'in' ? 1.5 : 0.5, opacity: [0, 0.2, 0] }}
            className="absolute inset-0 border-[40px] border-primary/10 rounded-full blur-3xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main BrazilMap Component ─────────────────────────────────────────────────
export default function BrazilMap({
  selectedUF, modo, filtroUsuario, assignedStates = [], mostrarVagos,
  onSelectUF, onSelectMunicipio, searchQuery,
  municipioCodeForBairros, selectedMunicipioCode, onDeactivateBairros, selectedMunicipioName, showClientes, showHeatmap,
  showUsuarios,
  onContextMenuState, onContextMenuMunicipio,
  flyToLocation, searchResultGeo,
  selectedClients = [], onSelectClients, onResetMap, onZoomToLocation
}: BrazilMapProps) {
  const { role, estado_end, token, userId: loggedUserId, assigned_state } = useAuth();
  const { data: statesMetadata } = useStatesMetadata();
  const { data: statesGeo } = useStatesGeoJSON();
  const { data: apiUsers = [] } = useApiUsers(!!token);
  const { data: apiTerritories = [] } = useApiTerritories(!!token);

  const effectiveAssignedStates = useMemo(() => {
    if (role === 'admin') return assignedStates;
    const fromProps = buildAssignedStates(assigned_state, assignedStates);
    if (fromProps.length > 0) return fromProps;
    const myUfs = apiTerritories
      .filter((t) => t.userId === loggedUserId)
      .map((t) => t.uf)
      .filter(Boolean);
    return buildAssignedStates(assigned_state, myUfs);
  }, [role, assigned_state, assignedStates, apiTerritories, loggedUserId]);
  const queryClient = useQueryClient();

  const filteredStatesGeo = useMemo(() => {
    if (!statesGeo) return null;
    
    // Admins see everything
    if (role === 'admin') return statesGeo;
    
    // Non-admins with no assigned states should see NOTHING (isolation)
    if (!effectiveAssignedStates || effectiveAssignedStates.length === 0) {
      return { ...statesGeo, features: [] } as GeoJSONFeatureCollection;
    }
    
    // Show ONLY assigned states
    return {
      ...statesGeo,
      features: (statesGeo.features as GeoJSONFeature[]).filter(f => {
        const uf = getUFByCode(Number(f?.properties?.codarea));
        return uf && effectiveAssignedStates.includes(uf.sigla);
      })
    } as GeoJSONFeatureCollection;
  }, [statesGeo, effectiveAssignedStates, role]);

  const handleClaimMunicipio = useCallback(async (municipio: string, uf: string) => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ municipio, uf, modo })
      });

      if (res.ok) {
        toast.success(`Você agora é responsável por ${municipio}!`);
        queryClient.invalidateQueries({ queryKey: ["api", "territories"] });
      } else {
        const err = await res.json();
        toast.error(err.message || 'Erro ao reivindicar município.');
      }
    } catch (error) {
      toast.error('Erro de conexão ao reivindicar município.');
    }
  }, [token, queryClient, modo]);

  // If the logged-in user is not admin, always show their clients; otherwise use the admin filter
  const effectiveUserFilter = role !== 'admin' ? loggedUserId : (filtroUsuario || null);
  const { data: apiClientes = [] } = useApiClientes(effectiveUserFilter);

  const [isMapMoving, setIsMapMoving] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'dark-labels' | 'light' | 'satellite' | 'osm'>('light');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [clientContextMenu, setClientContextMenu] = useState<{ client: Cliente, x: number, y: number } | null>(null);

  const MAP_THEMES = {
    'dark': { label: 'Escuro', url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', opacity: 0.4 },
    'dark-labels': { label: 'Escuro + Labels', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', opacity: 0.5 },
    'light': { label: 'Claro', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', opacity: 1.0 },
    'satellite': { label: 'Satélite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', opacity: 1.0 },
    'osm': { label: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', opacity: 1.0 },
  } as const;

  const ufInfo = selectedUF ? getUFBySigla(selectedUF) : null;
  const { data: citiesMetadata } = useCitiesMetadata(selectedUF);
  const { data: municipioNamesByCode } = useMunicipioNames(ufInfo?.codigo ?? null);
  const citiesList = useMemo(() => {
    if (Array.isArray(citiesMetadata)) return citiesMetadata;
    if (citiesMetadata && typeof citiesMetadata === "object") {
      const maybeData = (citiesMetadata as { data?: unknown; cities?: unknown }).data;
      const maybeCities = (citiesMetadata as { data?: unknown; cities?: unknown }).cities;
      if (Array.isArray(maybeData)) return maybeData;
      if (Array.isArray(maybeCities)) return maybeCities;
    }
    return [];
  }, [citiesMetadata]);

  const { data: municipiosGeo } = useMunicipiosGeoJSON(ufInfo?.codigo ?? null);
  const { data: neighborhoodsGeo, isLoading: loadingNeighborhoods } = useNeighborhoodsGeoJSON(
    municipioCodeForBairros || null,
    selectedMunicipioName || undefined,
    selectedUF || undefined
  );

  // Sincronização de segurança: limpa bairros se sair do estado ou se não houver NADA selecionado
  useEffect(() => {
    if (!selectedUF || (!selectedMunicipioCode && !municipioCodeForBairros)) {
      if (municipioCodeForBairros) onDeactivateBairros?.();
    }
  }, [selectedUF, selectedMunicipioCode, municipioCodeForBairros, onDeactivateBairros]);

  const center: [number, number] = ufInfo ? ufInfo.center : [-14.2, -51.9];
  const zoom = ufInfo ? ufInfo.zoom : 4;

  const munGeo = useMemo(() => {
    if (!municipiosGeo) return null;

    if (selectedMunicipioCode) {
      return (municipiosGeo.features as GeoJSONFeature[])?.find(
        (f) => String(f.properties?.codarea) === String(selectedMunicipioCode)
      ) || null;
    }

    if (!selectedMunicipioName || citiesList.length === 0) return null;
    const city = citiesList.find(
      (c: { name: string; ibgeCode: number | string }) => c.name.toLowerCase() === selectedMunicipioName.toLowerCase()
    );
    if (!city) return null;
    return (municipiosGeo.features as GeoJSONFeature[])?.find((f) => String(f.properties?.codarea) === String(city.ibgeCode)) || null;
  }, [municipiosGeo, selectedMunicipioCode, selectedMunicipioName, citiesList]);

  const stateGeo = useMemo(() => {
    if (!statesGeo || !selectedUF) return null;
    return (statesGeo.features as GeoJSONFeature[])?.find((f) => {
      const uf = getUFByCode(Number(f?.properties?.codarea));
      return uf && uf.sigla === selectedUF;
    }) || null;
  }, [statesGeo, selectedUF]);

  const neighborhoodGeo = useMemo(() => {
    if (!neighborhoodsGeo || !selectedNeighborhood) return null;
    return neighborhoodsGeo.features.find(f => f.properties?.nome === selectedNeighborhood) || null;
  }, [neighborhoodsGeo, selectedNeighborhood]);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const neighborhoodStyle = useCallback((feature: unknown) => {
    const isSelected = (feature as GeoJSONFeature).properties?.nome === selectedNeighborhood;
    const hideSelection = isMapMoving && isSelected;

    return {
      fillColor: isSelected ? "hsl(168, 60%, 40%)" : "hsl(168, 60%, 40%)",
      weight: isSelected ? 2.5 : 1.2,
      opacity: 1,
      color: isSelected && !hideSelection ? "hsl(var(--admin-sidebar-accent))" : "hsl(168, 70%, 65%)",
      fillOpacity: isSelected ? 0.3 : 0.1,
      dashArray: isSelected ? undefined : "4 3",
    };
  }, [selectedNeighborhood, isMapMoving]);

  const stateStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const ufCode = Number(f?.properties?.codarea);
    const uf = getUFByCode(ufCode);
    const isSelected = uf && selectedUF === uf.sigla;
    const hideSelection = isMapMoving && isSelected;

    // Se o usuário não tem permissão para este estado, ele deve ficar visualmente inativo
    const isAllowed = role === 'admin' || (uf && effectiveAssignedStates.includes(uf.sigla));

    if (!isAllowed) {
      return {
        fillColor: "hsl(220, 15%, 5%)",
        weight: 0.1,
        opacity: 0,
        color: "transparent",
        fillOpacity: 0,
        interactive: false
      };
    }

    // If showUsuarios is active, show state color based on assignments
    if (showUsuarios && uf) {
      const stateTerritories = apiTerritories.filter(t => t.uf === uf.sigla);
      if (stateTerritories.length > 0) {
        // Get the color of the first user found in this state
        const firstUserId = stateTerritories[0].userId;
        const user = firstUserId ? getUserById(firstUserId, apiUsers) : null;
        const color = user ? getUserColor(user) : "hsl(210, 80%, 40%)";

        return {
          fillColor: color,
          weight: isSelected ? 2 : 1.5,
          opacity: 1,
          color: isSelected && !hideSelection ? "hsl(var(--admin-sidebar-accent))" : color,
          fillOpacity: 0.4,
        };
      }
    }

    return {
      fillColor: isSelected ? "hsl(168, 70%, 45%)" : "hsl(220, 15%, 25%)",
      weight: isSelected ? 2 : 1.5,
      opacity: 1,
      color: isSelected && !hideSelection ? "hsl(var(--admin-sidebar-accent))" : "hsl(220, 15%, 35%)",
      fillOpacity: isSelected ? 0.15 : 0.6,
    };
  }, [selectedUF, isMapMoving, showUsuarios, apiTerritories, apiUsers, role, effectiveAssignedStates]);

  const municipioStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const blank = { fillColor: "hsl(220, 15%, 20%)", weight: 1, opacity: 0.6, color: "hsl(220, 15%, 28%)", fillOpacity: 0.4 };
    if (!selectedUF) return blank;

    const codArea = f?.properties?.codarea;
    if (!codArea) return blank;
    const city = citiesList.find((c: { ibgeCode: number | string }) => String(c.ibgeCode) === String(codArea));
    const ibgeName = municipioNamesByCode?.[String(codArea)];
    const name = city?.name || ibgeName || String(f?.properties?.name || f?.properties?.nome || "").trim() || `Município ${codArea}`;
    const userIds = getMunicipioResponsaveis(name, selectedUF, modo, apiTerritories);

    // Only highlight if the search query is a specific word that matches name/user
    if (searchQuery && searchQuery.length > 2) {
      const q = searchQuery.toLowerCase();
      const userNames = userIds.map(id => apiUsers.find(u => u.id === id)?.full_name || "").join(" ").toLowerCase();
      const isMatch = name.toLowerCase().includes(q) || userIds.join(" ").toLowerCase().includes(q) || userNames.includes(q);

      if (isMatch) {
        const hasSelection = (selectedClients || []).length > 0;
        return {
          fillColor: "hsl(45, 90%, 55%)",
          weight: hasSelection ? 1.5 : 3,
          opacity: 1,
          color: "hsl(45, 90%, 40%)",
          fillOpacity: hasSelection ? 0.05 : 0.25
        };
      }
    }

    if (userIds.length === 0) return blank;
    
    // Always show user colors when there are users assigned
    // The filter controls which users to show, not whether to show colors at all
    const matchedUserId = (showUsuarios || filtroUsuario) 
      ? (filtroUsuario ? userIds.find(id => filtroUsuario.split(',').map(f => Number(f.trim())).includes(id)) : userIds[0])
      : userIds[0];

    if (filtroUsuario && !matchedUserId && !showUsuarios) {
      return { fillColor: "hsl(220, 15%, 15%)", weight: 0.5, opacity: 0.3, color: "hsl(220, 15%, 20%)", fillOpacity: 0.2 };
    }

    const user = getUserById(matchedUserId!, apiUsers);
    if (!user) return blank;

    if (mostrarVagos && !user.isVago) {
      return { fillColor: "hsl(220, 15%, 15%)", weight: 0.5, opacity: 0.3, color: "hsl(220, 15%, 20%)", fillOpacity: 0.2 };
    }
    const color = getUserColor(user);
    return {
      fillColor: color, weight: user.isVago ? 2 : 1.5, opacity: 1,
      color: user.isVago ? "hsl(0, 70%, 50%)" : color,
      fillOpacity: (showUsuarios || (filtroUsuario && matchedUserId)) ? 0.8 : (user.isVago ? 0.3 : 0.55),
      dashArray: user.isVago ? "6 4" : undefined,
    };
  }, [citiesList, municipioNamesByCode, selectedUF, modo, filtroUsuario, mostrarVagos, searchQuery, apiTerritories, apiUsers, selectedClients, showUsuarios]);

  const stateOutlineStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const ufCode = Number(f?.properties?.codarea);
    const uf = getUFByCode(ufCode);
    const isSel = uf && selectedUF === uf.sigla;
    const hideSelection = isMapMoving && isSel;

    // Se o usuário não tem permissão para este estado, ele não deve nem ser "interativo" (não disparar eventos de mouse)
    const isAllowed = role === 'admin' || (uf && effectiveAssignedStates.includes(uf.sigla));

    return {
      fillColor: "transparent" as const,
      weight: isSel ? 2 : 0.5,
      opacity: isSel ? 1 : 0.2,
      color: isSel && !hideSelection ? "hsl(var(--admin-sidebar-accent))" : "hsl(220, 15%, 25%)",
      fillOpacity: 0,
      interactive: isAllowed 
    };
  }, [selectedUF, isMapMoving, role, effectiveAssignedStates]);

  const targetMunicipioStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const codArea = f?.properties?.codarea;
    const city = citiesList.find((c: { ibgeCode: number | string }) => String(c.ibgeCode) === String(codArea));
    const ibgeName = municipioNamesByCode?.[String(codArea)];
    const name = city?.name || ibgeName || "";
    const isTarget = name.toLowerCase() === (selectedMunicipioName || "").toLowerCase();
    return isTarget
      ? { fillColor: "transparent", weight: 2.5, opacity: 1, color: "hsl(168, 70%, 70%)", fillOpacity: 0 }
      : { fillColor: "transparent", weight: 0, opacity: 0, color: "transparent", fillOpacity: 0 };
  }, [citiesList, municipioNamesByCode, selectedMunicipioName]);

  const onEachNeighborhood = useCallback((feature: unknown, layer: L.Layer) => {
    const f = feature as GeoJSONFeature;
    const name = f.properties?.nome || "Bairro";

    if (layer instanceof L.Path) {
      const el = layer.getElement();
      if (el) el.classList.add('map-hover-effect');
    }

    (layer as L.Path).on({
      mouseover: (e) => {
        e.target.bringToFront();
        e.target.setStyle({ color: 'hsl(var(--admin-sidebar-accent))', fillOpacity: 0.35, weight: 2.5 });
        e.target.bindTooltip(`<strong>${name}</strong>`, { sticky: true, direction: "top" }).openTooltip();
      },
      mouseout: (e) => {
        e.target.setStyle(neighborhoodStyle(f));
        e.target.closeTooltip();
      },
      click: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        setSelectedNeighborhood(name);
      }
    });
  }, [neighborhoodStyle]);

  // ── Event handlers ──────────────────────────────────────────────────────────
  const onEachState = useCallback((feature: unknown, layer: L.Layer) => {
    const f = feature as GeoJSONFeature;
    const ufCode = Number(f?.properties?.codarea);
    const ufMeta = Array.isArray(statesMetadata) ? statesMetadata?.find((s: { id: number }) => s.id === ufCode) : undefined;
    const uf = getUFByCode(ufCode);
    if (!uf) return;

    // Check if interaction is allowed
    // Se o usuário tiver um estado vinculado, ele SÓ pode interagir com esse estado.
    const isAllowed = role === 'admin' || (effectiveAssignedStates.length > 0 && effectiveAssignedStates.includes(uf.sigla));

    if (layer instanceof L.Path) {
      const el = layer.getElement() as HTMLElement | null;
      if (el) {
        el.classList.add('map-hover-effect');
        if (!isAllowed) {
          el.style.cursor = 'default';
          el.style.pointerEvents = 'none';
          el.style.filter = 'grayscale(1) opacity(0.05)'; // Almost invisible
        } else {
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'pointer';
          el.style.filter = 'none';
        }
      }
    }

    if (!isAllowed) {
      return;
    }

    (layer as L.Path).on({
      mouseover: (e) => {
        const currentStyle = stateStyle(f);
        e.target.setStyle({ 
          color: 'hsl(var(--admin-sidebar-accent))', 
          fillOpacity: Math.max(0.3, currentStyle.fillOpacity + 0.1), 
          weight: 2.5 
        });
        e.target.bindTooltip(uf.nome, { sticky: true }).openTooltip();
      },
      mouseout: (e) => {
        e.target.setStyle(stateStyle(f));
        e.target.closeTooltip();
      },
      click: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        onSelectUF(uf.sigla);
      },
      contextmenu: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        e.originalEvent.preventDefault();
        onContextMenuState?.(uf.nome, uf.sigla, e.originalEvent.clientX, e.originalEvent.clientY);
      },
    });
  }, [stateStyle, onSelectUF, onContextMenuState, statesMetadata, role, effectiveAssignedStates]);

  const onEachMunicipio = useCallback((feature: unknown, layer: L.Layer) => {
    const f = feature as GeoJSONFeature;
    if (!selectedUF) return;
    const codArea = f?.properties?.codarea;
    if (!codArea) return;
    const city = citiesList.find((c: { name: string; ibgeCode: number | string }) => String(c.ibgeCode) === String(codArea));
    const ibgeName = municipioNamesByCode?.[String(codArea)];
    const name = city?.name || ibgeName || String(f?.properties?.name || f?.properties?.nome || "").trim() || `Município ${codArea}`;
    const userIds = getMunicipioResponsaveis(name, selectedUF, modo, apiTerritories);

    // Role-based restrictions mapping
    const userDetails = userIds.map(id => {
      const u = getUserById(id, apiUsers);
      if (!u) return `ID: ${id}`;
      return `${u.username} - ${u.full_name || u.fullName}`;
    });

    const tooltipHtml = `
      <div class="p-2 space-y-1.5 min-w-[180px] text-slate-900">
        <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1">
          <span class="font-bold text-sm text-primary-foreground bg-primary px-2 py-0.5 rounded">${name}</span>
          <span class="text-[10px] font-bold text-slate-500">${selectedUF}</span>
        </div>
        ${userIds.length > 0 ? `
          <div class="space-y-1.5">
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Responsáveis</p>
            ${userDetails.map(detail => `
              <p class="text-[11px] font-bold text-slate-800 flex items-center gap-2 leading-tight">
                <span class="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                ${detail}
              </p>
            `).join("")}
          </div>
        ` : `
          <p class="text-xs text-slate-500 italic font-medium">Sem responsável atribuído</p>
        `}
        <div class="pt-1.5 mt-1 border-t border-slate-100">
          <p class="text-[9px] text-slate-400 font-bold leading-tight italic">Clique duplo para reivindicar este território.</p>
        </div>
      </div>
    `;

    if (layer instanceof L.Path) {
      const el = layer.getElement();
      if (el) el.classList.add('map-hover-effect');
    }

    (layer as L.Path).on({
      mouseover: (e) => {
        const currentStyle = municipioStyle(f);
        e.target.setStyle({ 
          color: 'hsl(var(--admin-sidebar-accent))', 
          fillOpacity: Math.min(0.8, currentStyle.fillOpacity + 0.2), 
          weight: 3 
        });
        e.target.bindTooltip(tooltipHtml, { sticky: true }).openTooltip();
      },
      mouseout: (e) => {
        e.target.setStyle(municipioStyle(f));
        e.target.closeTooltip();
      },
      click: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        const ibgeCode = Number(codArea);
        onSelectMunicipio(name, selectedUF, Number.isFinite(ibgeCode) ? ibgeCode : undefined);
      },
      dblclick: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        handleClaimMunicipio(name, selectedUF);
      },
      contextmenu: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        e.originalEvent.preventDefault();

        // Double right-click detection
        const now = Date.now();
        const lastClick = (layer as any)._lastRightClick || 0;

        if (now - lastClick < 500) {
          handleClaimMunicipio(name, selectedUF);
          (layer as any)._lastRightClick = 0; // Reset
          onContextMenuMunicipio?.("", "", 0, 0); // Close menu if open (hack using empty params)
        } else {
          (layer as any)._lastRightClick = now;
          onContextMenuMunicipio?.(name, selectedUF, e.originalEvent.clientX, e.originalEvent.clientY);
        }
      },
    });
  }, [citiesList, municipioNamesByCode, selectedUF, modo, municipioStyle, onSelectMunicipio, apiTerritories, apiUsers, onContextMenuMunicipio, role, estado_end, onResetMap, onSelectUF, handleClaimMunicipio]);

  // ── Neighborhood label markers — names from Brasil Aberto metadata if possible ───
  const markers: Array<{ center: L.LatLng; name: string }> = [];
  if (neighborhoodsGeo?.features) {
    for (const feature of neighborhoodsGeo.features) {
      const name = feature.properties?.nome || "Bairro";
      if (!name || !feature.geometry) continue;
      try {
        const bounds = L.geoJSON(feature).getBounds();
        if (bounds.isValid()) markers.push({ center: bounds.getCenter(), name });
      } catch { /* skip invalid geometry */ }
    }
  }


  // Filter clients
  const visibleClientes = useMemo(() => {
    if (!(showClientes || showHeatmap) || !apiClientes || !statesGeo) return [];

    let filterGeometry: GeoJSONFeature | GeoJSONFeatureCollection | null = null;
    if (selectedUF) {
      const stateFeature = statesGeo.features?.find((f) => {
        const uf = getUFByCode(Number(f?.properties?.codarea));
        return uf && uf.sigla === selectedUF;
      });
      if (stateFeature) filterGeometry = stateFeature as unknown as GeoJSONFeature;
    } else {
      filterGeometry = statesGeo as unknown as GeoJSONFeatureCollection;
    }

    return apiClientes.filter(c => {
      if (!c.latitude || !c.longitude) return false;
      if (selectedUF && c.uf !== selectedUF) return false;
      if (!selectedUF) return true;

      try {
        const pt = turfPoint([c.longitude, c.latitude]);
        if (filterGeometry) {
          return booleanPointInPolygon(pt, filterGeometry as Parameters<typeof booleanPointInPolygon>[1]);
        }
      } catch (e) {
        console.warn("Critical check failure for client", c.id_cliente, e);
      }
      return false;
    });
  }, [showClientes, showHeatmap, apiClientes, statesGeo, selectedUF]);

  const heatmapPoints: [number, number, number][] = useMemo(() =>
    showHeatmap ? visibleClientes.map(c => [c.latitude!, c.longitude!, 1]) : [],
    [showHeatmap, visibleClientes]);

  const handleBack = useCallback(() => {
    if (selectedNeighborhood) {
      setSelectedNeighborhood(null);
    } else if (municipioCodeForBairros) {
      onDeactivateBairros?.();
    } else if (selectedUF) {
      onSelectUF("");
      if (onResetMap) onResetMap();
    }
  }, [selectedNeighborhood, municipioCodeForBairros, selectedUF, onDeactivateBairros, onSelectUF, onResetMap]);

  const handleBackgroundDblClick = useCallback(() => {
    handleBack();
  }, [handleBack]);

  const minZoom = useMemo(() => {
    if (role === 'admin' || effectiveAssignedStates.length === 0) return 3;
    return (ufInfo?.zoom || 4);
  }, [role, effectiveAssignedStates, ufInfo]);

  const maxBounds = useMemo(() => {
    if (role === 'admin' || effectiveAssignedStates.length === 0 || !filteredStatesGeo) return undefined;
    try {
      return L.geoJSON(filteredStatesGeo).getBounds().pad(0.1);
    } catch (e) {
      return undefined;
    }
  }, [role, effectiveAssignedStates, filteredStatesGeo]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-background">
      <MapContainer
        center={center} zoom={zoom}
        className="w-full h-full"
        zoomControl={true}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={false}
        boxZoom={true}
        keyboard={true}
        attributionControl={false}
        style={{ background: "hsl(220, 20%, 8%)" }}
        minZoom={minZoom}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
      >
        <AttributionControl prefix={false} />
        <MapController center={center} zoom={zoom} flyToLocation={flyToLocation} selectedUF={selectedUF} />
        <MapAnimationController
          onMoveStart={() => setIsMapMoving(true)}
          onMoveEnd={() => setIsMapMoving(false)}
        />
        {/* Wind Animation Overlay */}
        <WindZoomAnimation />

        <MapEventHandler
          onBackgroundClick={() => {
            if (clientContextMenu) setClientContextMenu(null);
            // Only call reset/header logic if we aren't already focusing on something 
            // OR if the user is explicitly clicking empty space.
            // Leaflet propagation handles most cases, but Index.tsx handler is very aggressive.
          }}
          onBackgroundDblClick={handleBackgroundDblClick}
        />

        {/* Auto-zoom to features when selected */}
        {neighborhoodGeo && <ZoomToFeature geoJson={neighborhoodGeo} maxZoom={16} />}
        {!neighborhoodGeo && munGeo && <ZoomToFeature geoJson={munGeo} maxZoom={15} skipIfZoomed={true} />}
        {!neighborhoodGeo && !munGeo && stateGeo && <ZoomToFeature geoJson={stateGeo} maxZoom={ufInfo?.zoom || 7} skipIfZoomed={true} />}

        <TileLayer
          key={mapTheme}
          url={MAP_THEMES[mapTheme].url}
          attribution=""
          opacity={MAP_THEMES[mapTheme].opacity}
        />

        {/* Search Result Polygon Highlight */}
        {searchResultGeo && (
          <GeoJSON
            key={`search-result-${JSON.stringify(searchResultGeo).length}`}
            data={searchResultGeo}
            interactive={false}
            style={{
              fillColor: "hsl(190, 100%, 50%)",
              weight: 3,
              opacity: 1,
              color: "hsl(190, 100%, 40%)",
              fillOpacity: 0.1
            }}
          />
        )}

        {/* States layer (Level 1) */}
          {filteredStatesGeo && (
            <Pane name="basePane" style={{ zIndex: 100 }}>
              <GeoJSON 
                key={`states-${effectiveAssignedStates.join(',')}-${statesMetadata?.length || 0}-${showUsuarios}-${apiTerritories.length}-${selectedUF}`} 
                data={filteredStatesGeo} 
                style={selectedUF ? stateOutlineStyle : stateStyle} 
                onEachFeature={onEachState} 
              />
            </Pane>
          )}

        {/* Municipalities layer (Level 2) - Always show when a state is selected */}
        {municipiosGeo && selectedUF && (
          <Pane name="municipiosPane" style={{ zIndex: 400 }}>
            <GeoJSON
              key={`muns-${selectedUF}-${modo}-${filtroUsuario}-${showUsuarios}-${mostrarVagos}-${searchQuery}-${apiTerritories.length}-${citiesList.length}`}
              data={municipiosGeo}
              style={municipioStyle}
              onEachFeature={onEachMunicipio}
              interactive={true}
            />
            {/* Destaque do Município Selecionado (Sempre visível se selecionado) */}
            {(selectedMunicipioCode || selectedMunicipioName) && (
              <GeoJSON
                key={`muns-highlight-${selectedMunicipioCode || selectedMunicipioName}`}
                data={municipiosGeo}
                style={targetMunicipioStyle}
                interactive={false}
              />
            )}
          </Pane>
        )}

        {/* Bairros layer (Level 3) - Strict Hierarchy: Only when municipality is selected and active */}
        {municipioCodeForBairros && selectedMunicipioCode && String(municipioCodeForBairros) === String(selectedMunicipioCode) && (
          <Pane name="bairrosPane" style={{ zIndex: 450, pointerEvents: 'auto' }}>
            {/* Neighborhood polygons - Only render if we have a reasonable amount of features or high zoom */}
            {neighborhoodsGeo && (
              <GeoJSON
                key={`hoods-${municipioCodeForBairros}-${neighborhoodsGeo.features?.length ?? 0}`}
                data={neighborhoodsGeo}
                style={neighborhoodStyle}
                onEachFeature={onEachNeighborhood}
                interactive={true}
              />
            )}

            {/* Label markers */}
            {!isMapMoving && markers.map((m, i) => (
              <CircleMarker
                key={`nhood-marker-${i}`}
                center={m.center}
                radius={0}
                pathOptions={{ opacity: 0, fillOpacity: 0 }}
                interactive={false}
              >
                <LeafletTooltip
                  permanent
                  direction="center"
                  className="neighborhood-map-label"
                  offset={[0, 0]}
                >
                  {m.name}
                </LeafletTooltip>
              </CircleMarker>
            ))}

            {/* Loading indicator */}
            <AnimatePresence>
              {loadingNeighborhoods && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 9999 }}
                  className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-4 py-3 flex items-center gap-2 shadow-xl"
                >
                  <Loader className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-foreground">Carregando bairros...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Pane>
        )}

        {/* Heatmap Layer */}
        {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

        {/* Client Pins */}
        {showClientes && (
          <Pane name="topPane" style={{ zIndex: 700, pointerEvents: 'none' }}>
            {visibleClientes.map((cliente) => {
              const isSelected = selectedClients.some(c => c.id_cliente === cliente.id_cliente);
              const user = getUserById(cliente.userId as number, apiUsers);
              const color = user ? getUserColor(user) : "hsl(190, 100%, 50%)";

              return (
                <CircleMarker
                  key={`cliente-${cliente.id_cliente}`}
                  center={[cliente.latitude!, cliente.longitude!]}
                  radius={isSelected ? 6 : 4}
                  pathOptions={{
                    pane: "markerPane", // Elevates it above SVG polygons
                    fillColor: isSelected ? "hsl(45, 100%, 50%)" : color,
                    color: isSelected ? "white" : (user ? color : "hsl(190, 100%, 30%)"),
                    weight: isSelected ? 3 : 2,
                    opacity: 0.9,
                    fillOpacity: 1
                  }}
                  interactive={true}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      // Previne o dblclick nativo do Leaflet de disparar zoom indesejado ao clicar no marcador
                      L.DomEvent.preventDefault(e.originalEvent);
                      
                      if (clientContextMenu) setClientContextMenu(null);
                      const isCtrl = e.originalEvent.ctrlKey;

                      if (onSelectClients) {
                        if (isCtrl) {
                          if (isSelected) {
                            onSelectClients(selectedClients.filter(c => c.id_cliente !== cliente.id_cliente));
                          } else {
                            onSelectClients([...selectedClients, cliente]);
                          }
                        } else {
                          onSelectClients([cliente]);
                        }
                      }
                    },
                    dblclick: (e) => {
                      // Mata explicitamente o zoom por clique duplo no marcador
                      L.DomEvent.stopPropagation(e.originalEvent);
                      L.DomEvent.preventDefault(e.originalEvent);
                    },
                    contextmenu: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      e.originalEvent.preventDefault();
                      setClientContextMenu({
                        client: cliente,
                        x: e.originalEvent.clientX,
                        y: e.originalEvent.clientY
                      });
                    }
                  }}
                >
                  <LeafletTooltip direction="top" className="custom-tooltip" pane="topPane">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-sm text-primary">{cliente.nome_cliente}</span>
                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded opacity-70">#{cliente.codigo_cliente}</span>
                      </div>
                      {cliente.nome_abreviado && (
                        <p className="text-xs font-medium text-muted-foreground border-t border-border/50 pt-1">
                          {cliente.nome_abreviado}
                        </p>
                      )}
                      <div className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded-md mt-2">
                        {cliente.endereco_completo && <p className="leading-tight">{cliente.endereco_completo}</p>}
                        {cliente.bairro && <p className="mt-1 font-semibold uppercase tracking-wider">{cliente.bairro}</p>}
                      </div>
                    </div>
                  </LeafletTooltip>
                </CircleMarker>
              );
            })}
          </Pane>
        )}

        <MapContextActions
          clientContextMenu={clientContextMenu}
          onClose={() => setClientContextMenu(null)}
          onSelectClients={onSelectClients}
          onZoomToLocation={onZoomToLocation}
        />
      </MapContainer>

      {/* Universal Back button for hierarchy navigation */}
      <AnimatePresence>
        {(selectedUF || municipioCodeForBairros || selectedNeighborhood) && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="absolute top-4 left-14 z-[1000]"
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-sm border border-border text-foreground text-xs font-semibold rounded-md shadow-lg hover:bg-secondary transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {selectedNeighborhood ? "Voltar ao Município" : (municipioCodeForBairros ? "Voltar ao Estado" : "Voltar ao Brasil")}
            </button>
            {municipioCodeForBairros && markers.length > 0 && (
              <div className="mt-2 px-3 py-1.5 bg-card/80 backdrop-blur-sm border border-border/50 rounded-md text-[10px] text-muted-foreground">
                {markers.length} bairro(s) carregado(s)
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Map Theme Picker */}
      <div className="absolute bottom-6 right-3 z-[1000]">
        <div className="relative">
          <button
            onClick={() => setShowThemePicker(p => !p)}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-card/95 backdrop-blur-sm border border-border text-foreground text-xs font-semibold rounded-md shadow-lg hover:bg-secondary transition-all"
            title="Tema do mapa"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{MAP_THEMES[mapTheme].label}</span>
          </button>
          {showThemePicker && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              className="absolute bottom-full mb-2 right-0 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-xl overflow-hidden min-w-[160px]"
            >
              {(Object.entries(MAP_THEMES) as [typeof mapTheme, typeof MAP_THEMES[typeof mapTheme]][]).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => { setMapTheme(key); setShowThemePicker(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${mapTheme === key
                      ? 'bg-primary/20 text-primary font-semibold'
                      : 'text-foreground hover:bg-secondary'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full border flex-shrink-0 ${mapTheme === key ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`} />
                  {theme.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <div
        className="absolute inset-0 pointer-events-none z-[500]"
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      />

      <style>{`
        .custom-tooltip {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 8px !important;
          padding: 0 !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          overflow: hidden !important;
        }
        .custom-tooltip::before {
          display: none !important;
        }
        .map-motion-blur {
          filter: blur(0.5px) contrast(1.1);
          transition: filter 0.3s ease;
        }
      `}</style>
    </div>
  );
}
