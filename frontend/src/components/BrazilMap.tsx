import { RotateCcw, Loader, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import {
  MapContainer, TileLayer, GeoJSON, useMap,
  AttributionControl, CircleMarker, Tooltip as LeafletTooltip, Pane
} from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { useQuery } from "@tanstack/react-query";
import { booleanPointInPolygon, point as turfPoint } from "@turf/turf";
import {
  useStatesGeoJSON, useMunicipiosGeoJSON, useMunicipioNames,
  useNeighborhoodsGeoJSON, useStatesMetadata, useCitiesMetadata
} from "@/hooks/use-geo-data";
import { useAuth } from "@/contexts/auth-context-core";
import { getUFByCode, getUFBySigla } from "@/data/uf-codes";
import { getMunicipioResponsaveis } from "@/data/territories";
import { getRepColor, getRepByCode } from "@/data/representatives";
import { useApiRepresentatives, useApiTerritories, useApiClientes, Representative, TerritoryAssignment, Cliente, GeoJSONFeatureCollection, GeoJSONFeature, SearchSuggestion } from "@/hooks/use-api-data";

interface BrazilMapProps {
  selectedUF: string | null;
  modo: "planejamento" | "atendimento";
  filtroRepresentante: string | null;
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
  onContextMenuState?: (nome: string, uf: string, x: number, y: number) => void;
  onContextMenuMunicipio?: (nome: string, uf: string, x: number, y: number) => void;
  flyToLocation?: { center: [number, number]; zoom: number } | null;
  searchResultGeo?: GeoJSONFeatureCollection | GeoJSONFeature | null;
  selectedClients?: Cliente[];
  onSelectClients?: (clients: Cliente[]) => void;
  onResetMap?: () => void;
  onZoomToLocation?: (center: [number, number], zoom: number) => void;
}

const API_BASE = "http://localhost:3001";

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
    if (!hasFlyTo && map.getZoom() < 10) {
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

// ─── Zoom to a specific GeoJSON feature bounds ───────────────────────────────
function ZoomToFeature({ geoJson, maxZoom = 13 }: { geoJson: GeoJSONFeature | GeoJSONFeatureCollection; maxZoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!geoJson) return;
    try {
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
  }, [geoJson, map, maxZoom]);
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



// ─── Main BrazilMap Component ─────────────────────────────────────────────────
export default function BrazilMap({
  selectedUF, modo, filtroRepresentante, mostrarVagos,
  onSelectUF, onSelectMunicipio, searchQuery,
  municipioCodeForBairros, selectedMunicipioCode, onDeactivateBairros, selectedMunicipioName, showClientes, showHeatmap,
  onContextMenuState, onContextMenuMunicipio,
  flyToLocation, searchResultGeo,
  selectedClients = [], onSelectClients, onResetMap, onZoomToLocation
}: BrazilMapProps) {
  const { role, estado_end, token, repCode: loggedRepCode } = useAuth();
  const { data: statesMetadata } = useStatesMetadata();
  const { data: statesGeo } = useStatesGeoJSON();
  const { data: apiReps = [] } = useApiRepresentatives(!!token);
  const { data: apiTerritories = [] } = useApiTerritories(!!token);
  // If the logged-in user is a representative, always show their clients; otherwise use the admin filter
  const effectiveRepFilter = role === 'representante' ? loggedRepCode : filtroRepresentante;
  const { data: apiClientes = [] } = useApiClientes(effectiveRepFilter);

  const [isMapMoving, setIsMapMoving] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'dark-labels' | 'light' | 'satellite' | 'osm'>('dark');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [clientContextMenu, setClientContextMenu] = useState<{ client: Cliente, x: number, y: number } | null>(null);

  const MAP_THEMES = {
    'dark': { label: 'Escuro', url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', opacity: 0.4 },
    'dark-labels': { label: 'Escuro + Labels', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', opacity: 0.5 },
    'light': { label: 'Claro', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', opacity: 0.9 },
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
      fillColor: isSelected ? "hsl(168, 60%, 40%)" : "transparent",
      weight: isSelected ? 2.5 : 1.5,
      opacity: 1,
      color: isSelected && !hideSelection ? "hsl(var(--admin-sidebar-accent))" : "hsl(168, 70%, 65%)",
      fillOpacity: isSelected ? 0.2 : 0.05,
      dashArray: isSelected ? undefined : "4 3",
    };
  }, [selectedNeighborhood, isMapMoving]);

  const stateStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const ufCode = Number(f?.properties?.codarea);
    const uf = getUFByCode(ufCode);
    const isSelected = uf && selectedUF === uf.sigla;
    const hideSelection = isMapMoving && isSelected;

    return {
      fillColor: isSelected ? "hsl(168, 70%, 45%)" : "hsl(220, 15%, 25%)",
      weight: isSelected ? 2 : 1.5,
      opacity: 1,
      color: isSelected && !hideSelection ? "hsl(var(--admin-sidebar-accent))" : "hsl(220, 15%, 35%)",
      fillOpacity: isSelected ? 0.15 : 0.6,
    };
  }, [selectedUF, isMapMoving]);

  const municipioStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const blank = { fillColor: "hsl(220, 15%, 20%)", weight: 1, opacity: 0.6, color: "hsl(220, 15%, 28%)", fillOpacity: 0.4 };
    if (!selectedUF) return blank;

    const codArea = f?.properties?.codarea;
    if (!codArea) return blank;
    const city = citiesList.find((c: { ibgeCode: number | string }) => String(c.ibgeCode) === String(codArea));
    const ibgeName = municipioNamesByCode?.[String(codArea)];
    const name = city?.name || ibgeName || String(f?.properties?.name || f?.properties?.nome || "").trim() || `Município ${codArea}`;
    const reps = getMunicipioResponsaveis(name, selectedUF, modo, apiTerritories);

    // Only highlight if the search query is a specific word that matches name/rep
    if (searchQuery && searchQuery.length > 2) {
      const q = searchQuery.toLowerCase();
      const repNames = reps.map(c => apiReps.find(r => r.code === c)?.name || "").join(" ").toLowerCase();
      const isMatch = name.toLowerCase().includes(q) || reps.join(" ").toLowerCase().includes(q) || repNames.includes(q);

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

    if (reps.length === 0) return blank;
    const rep = getRepByCode(reps[0], apiReps);
    if (!rep) return blank;
    if (filtroRepresentante && !reps.includes(filtroRepresentante)) {
      return { fillColor: "hsl(220, 15%, 15%)", weight: 0.5, opacity: 0.3, color: "hsl(220, 15%, 20%)", fillOpacity: 0.2 };
    }
    if (mostrarVagos && !rep.isVago) {
      return { fillColor: "hsl(220, 15%, 15%)", weight: 0.5, opacity: 0.3, color: "hsl(220, 15%, 20%)", fillOpacity: 0.2 };
    }
    const color = getRepColor(rep);
    return {
      fillColor: color, weight: rep.isVago ? 2 : 1.5, opacity: 1,
      color: rep.isVago ? "hsl(0, 70%, 50%)" : color,
      fillOpacity: rep.isVago ? 0.3 : 0.55,
      dashArray: rep.isVago ? "6 4" : undefined,
    };
  }, [citiesList, municipioNamesByCode, selectedUF, modo, filtroRepresentante, mostrarVagos, searchQuery, apiTerritories, apiReps, selectedClients]);

  const stateOutlineStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const uf = getUFByCode(Number(f?.properties?.codarea));
    const isSel = uf && selectedUF === uf.sigla;
    const hideSelection = isMapMoving && isSel;

    return {
      fillColor: "transparent" as const,
      weight: isSel ? 2 : 0.5,
      opacity: isSel ? 1 : 0.2,
      color: isSel && !hideSelection ? "hsl(var(--admin-sidebar-accent))" : "hsl(220, 15%, 25%)",
      fillOpacity: 0
    };
  }, [selectedUF, isMapMoving]);

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

    if (layer instanceof L.Path) {
      const el = layer.getElement();
      if (el) el.classList.add('map-hover-effect');
    }

    (layer as L.Path).on({
      mouseover: (e) => {
        e.target.setStyle({ color: 'hsl(var(--admin-sidebar-accent))', fillOpacity: 0.3, weight: 2.5 });
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
  }, [stateStyle, onSelectUF, onContextMenuState, statesMetadata]);

  const onEachMunicipio = useCallback((feature: unknown, layer: L.Layer) => {
    const f = feature as GeoJSONFeature;
    if (!selectedUF) return;
    const codArea = f?.properties?.codarea;
    if (!codArea) return;
    const city = citiesList.find((c: { name: string; ibgeCode: number | string }) => String(c.ibgeCode) === String(codArea));
    const ibgeName = municipioNamesByCode?.[String(codArea)];
    const name = city?.name || ibgeName || String(f?.properties?.name || f?.properties?.nome || "").trim() || `Município ${codArea}`;
    const reps = getMunicipioResponsaveis(name, selectedUF, modo, apiTerritories);

    // Role-based restrictions mapping
    let tooltipHtml = '';
    if (role === 'user' && estado_end && selectedUF !== estado_end) {
      if (reps.length > 0) {
        const hasVago = reps.some(c => getRepByCode(c, apiReps)?.isVago);
        tooltipHtml = `<strong>${name}</strong><br/>${hasVago ? '<em>Vago</em>' : '<em>Ocupado</em>'}`;
      } else {
        tooltipHtml = `<strong>${name}</strong><br/><em>Sem responsável</em>`;
      }
    } else {
      const repNames = reps.map(c => { const r = getRepByCode(c, apiReps); return r ? `${r.code} - ${r.name}` : c; });
      tooltipHtml = reps.length > 0
        ? `<strong>${name}</strong><br/>${repNames.join("<br/>")}`
        : `<strong>${name}</strong><br/><em>Sem responsável</em>`;
    }

    if (layer instanceof L.Path) {
      const el = layer.getElement();
      if (el) el.classList.add('map-hover-effect');
    }

    (layer as L.Path).on({
      mouseover: (e) => {
        e.target.setStyle({ color: 'hsl(var(--admin-sidebar-accent))', fillOpacity: 0.6, weight: 3 });
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
        onSelectUF("");
        if (onResetMap) onResetMap();
      },
      contextmenu: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        e.originalEvent.preventDefault();
        onContextMenuMunicipio?.(name, selectedUF, e.originalEvent.clientX, e.originalEvent.clientY);
      },
    });
  }, [citiesList, municipioNamesByCode, selectedUF, modo, municipioStyle, onSelectMunicipio, apiTerritories, apiReps, onContextMenuMunicipio, role, estado_end, onResetMap, onSelectUF]);

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

  return (
    <div className="w-full h-full relative overflow-hidden bg-background">
      <MapContainer
        center={center} zoom={zoom}
        className="w-full h-full"
        zoomControl={true}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
        attributionControl={false}
        style={{ background: "hsl(220, 20%, 8%)" }}
        minZoom={3}
      >
        <AttributionControl prefix={false} />
        <MapController center={center} zoom={zoom} flyToLocation={flyToLocation} selectedUF={selectedUF} />
        <MapAnimationController
          onMoveStart={() => setIsMapMoving(true)}
          onMoveEnd={() => setIsMapMoving(false)}
        />
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
        {!neighborhoodGeo && munGeo && <ZoomToFeature geoJson={munGeo} maxZoom={15} />}
        {!neighborhoodGeo && !munGeo && stateGeo && <ZoomToFeature geoJson={stateGeo} maxZoom={ufInfo?.zoom || 7} />}

        <TileLayer
          key={mapTheme}
          url={MAP_THEMES[mapTheme].url}
          attribution="Desenvolvido por Lucas Ávila"
          opacity={MAP_THEMES[mapTheme].opacity}
          className={isMapMoving ? "map-motion-blur" : ""}
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
          {statesGeo && !selectedUF && (
            <Pane name="basePane" style={{ zIndex: 100 }}>
              <GeoJSON 
                key={`states-${statesMetadata?.length || 0}`} 
                data={statesGeo} 
                style={stateStyle} 
                onEachFeature={onEachState} 
              />
            </Pane>
          )}
          {statesGeo && selectedUF && (
            <Pane name="basePane" style={{ zIndex: 100 }}>
              <GeoJSON 
                key={`states-outline-${selectedUF}`} 
                data={statesGeo} 
                style={stateOutlineStyle} 
                interactive={false}
              />
            </Pane>
          )}

        {/* Municipalities layer (Level 2) - Always show when a state is selected */}
        {municipiosGeo && selectedUF && (
          <GeoJSON
            key={`muns-${selectedUF}-${modo}-${filtroRepresentante}-${mostrarVagos}-${searchQuery}-${apiTerritories.length}-${citiesList.length}`}
            data={municipiosGeo}
            style={municipioStyle}
            onEachFeature={onEachMunicipio}
            interactive={true}
          />
        )}

        {/* Bairros layer (Level 3) */}
        {municipioCodeForBairros && (
          <Pane name="bairrosPane" style={{ zIndex: 450, pointerEvents: 'auto' }}>
            {/* Show selected municipality boundary */}
            {municipiosGeo && selectedUF && (
              <GeoJSON
                key={`muns-bg-${municipioCodeForBairros}`}
                data={municipiosGeo}
                style={targetMunicipioStyle}
                interactive={false}
              />
            )}

            {/* Neighborhood polygons */}
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
              const rep = getRepByCode(cliente.repCode as string, apiReps);
              const repColor = rep ? getRepColor(rep) : "hsl(190, 100%, 50%)";

              return (
                <CircleMarker
                  key={`cliente-${cliente.id_cliente}`}
                  center={[cliente.latitude!, cliente.longitude!]}
                  radius={isSelected ? 6 : 4}
                  pathOptions={{
                    pane: "markerPane", // Elevates it above SVG polygons
                    fillColor: isSelected ? "hsl(45, 100%, 50%)" : repColor,
                    color: isSelected ? "white" : (rep ? repColor : "hsl(190, 100%, 30%)"),
                    weight: isSelected ? 3 : 2,
                    opacity: 0.9,
                    fillOpacity: 1
                  }}
                  interactive={true}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
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
                    contextmenu: (e) => {
                      L.DomEvent.stopPropagation(e);
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
