import { RotateCcw, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import {
  MapContainer, TileLayer, GeoJSON, useMap,
  AttributionControl, CircleMarker, Tooltip as LeafletTooltip
} from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { useQuery } from "@tanstack/react-query";
import { booleanPointInPolygon, point as turfPoint } from "@turf/turf";
import {
  useStatesGeoJSON, useMunicipiosGeoJSON, useMunicipioNames,
  useNeighborhoodsGeoJSON
} from "@/hooks/use-geo-data";
import { useAuth } from "@/contexts/AuthContext";
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
  onSelectMunicipio: (municipio: string, uf: string) => void;
  searchQuery: string;
  municipioCodeForBairros?: number | null;
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
}

const API_BASE = "http://localhost:3001";

function MapController({ center, zoom, flyToLocation, selectedUF }: { center: [number, number]; zoom: number; flyToLocation?: { center: [number, number]; zoom: number } | null; selectedUF: string | null }) {
  const map = useMap();
  const isFirst = useRef(true);

  const centerLat = center[0];
  const centerLng = center[1];
  const hasFlyTo = !!flyToLocation;

  // Initial view and state-driven animations
  useEffect(() => {
    if (!map) return;
    if (isFirst.current) { 
      isFirst.current = false; 
      map.setView(center, zoom); 
      return;
    }

    // Se houver uma UF selecionada, seguimos a visão dela.
    // Mas se não houver UF (visão Brasil), não forçamos a visão a cada render,
    // pois isso mataria o zoom manual do usuário.
    if (selectedUF && !hasFlyTo) {
        map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
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

// ─── Map event handler for global clicks (deselect on background click) ────
function MapEventHandler({ onBackgroundClick }: { onBackgroundClick: () => void }) {
  const map = useMap();
  useEffect(() => {
    map.on("click", onBackgroundClick);
    return () => { map.off("click", onBackgroundClick); };
  }, [map, onBackgroundClick]);
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

// ─── Speed Lines Overlay (Falling Effect) ──────────────────────────────────
function SpeedLinesOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 z-[2000] pointer-events-none overflow-hidden flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full h-full relative"
      >
        {/* Deep background glow pulse */}
        <div className="absolute inset-0 bg-primary/5 backdrop-blur-[2px]" />

        {/* Dense Star Dust / Particles */}
        {[...Array(80)].map((_, i) => (
          <motion.div
            key={`dot-${i}`}
            initial={{ 
              x: "50%", y: "50%", 
              scale: 0, opacity: 0 
            }}
            animate={{ 
              x: `${50 + (Math.random() * 140 - 70)}%`,
              y: `${50 + (Math.random() * 140 - 70)}%`,
              scale: [0, Math.random() * 2 + 1, 0],
              opacity: [0, 0.8, 0]
            }}
            transition={{
              duration: 0.8 + Math.random() * 0.7,
              repeat: Infinity,
              delay: Math.random() * 1,
              ease: "easeOut"
            }}
            className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"
          />
        ))}

        {/* Intense Speed lines radiating from center */}
        {[...Array(60)].map((_, i) => (
          <motion.div
            key={`r-${i}`}
            initial={{ 
              scaleX: 0, 
              opacity: 0,
              rotate: (i * 6), // More density
              x: 0,
              y: 0
            }}
            animate={{ 
              scaleX: [0, 2.5, 0],
              opacity: [0, 0.7, 0],
              x: [0, (Math.cos(i * 6 * Math.PI / 180) * 1200)],
              y: [0, (Math.sin(i * 6 * Math.PI / 180) * 1200)]
            }}
            transition={{
              duration: 0.5 + Math.random() * 0.3,
              repeat: Infinity,
              delay: Math.random() * 0.4,
              ease: "circIn"
            }}
            className="absolute w-48 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent"
            style={{ transformOrigin: "left center" }}
          />
        ))}
        
        {/* High-speed vertical falling streaks */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={`v-${i}`}
            initial={{ y: -800, x: (Math.random() * 120 - 10) + "%", opacity: 0 }}
            animate={{ y: 2000, opacity: [0, 0.5, 0] }}
            transition={{
              duration: 0.3 + Math.random() * 0.2,
              repeat: Infinity,
              delay: Math.random() * 0.3,
              ease: "linear"
            }}
            className="absolute w-[1.5px] h-96 bg-gradient-to-b from-transparent via-white/30 to-transparent"
          />
        ))}

        {/* Radial Vignette effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />
      </motion.div>
    </div>
  );
}


// ─── Main BrazilMap Component ─────────────────────────────────────────────────
export default function BrazilMap({
  selectedUF, modo, filtroRepresentante, mostrarVagos,
  onSelectUF, onSelectMunicipio, searchQuery,
  municipioCodeForBairros, onDeactivateBairros, selectedMunicipioName, showClientes, showHeatmap,
  onContextMenuState, onContextMenuMunicipio,
  flyToLocation, searchResultGeo,
  selectedClients = [], onSelectClients
}: BrazilMapProps) {
  const { role, estado_end, token, repCode: loggedRepCode } = useAuth();
  const { data: statesGeo } = useStatesGeoJSON();
  const { data: apiReps = [] } = useApiRepresentatives(!!token);
  const { data: apiTerritories = [] } = useApiTerritories(!!token);
  // If the logged-in user is a representative, always show their clients; otherwise use the admin filter
  const effectiveRepFilter = role === 'representante' ? loggedRepCode : filtroRepresentante;
  const { data: apiClientes = [] } = useApiClientes(effectiveRepFilter);

  const [isMapMoving, setIsMapMoving] = useState(false);

  const ufInfo = selectedUF ? getUFBySigla(selectedUF) : null;
  const { data: municipiosGeo } = useMunicipiosGeoJSON(ufInfo?.codigo ?? null);
  const { data: municipioNames } = useMunicipioNames(ufInfo?.codigo ?? null);
  const { data: neighborhoodsGeo, isLoading: loadingNeighborhoods } = useNeighborhoodsGeoJSON(municipioCodeForBairros || null);

  const center: [number, number] = ufInfo ? ufInfo.center : [-14.2, -51.9];
  const zoom = ufInfo ? ufInfo.zoom : 4;

  const munGeo = useMemo(() => {
    if (!municipiosGeo || !selectedMunicipioName || !municipioNames) return null;
    const entry = Object.entries(municipioNames).find(
      ([, name]) => (name as string).toLowerCase() === selectedMunicipioName.toLowerCase()
    );
    if (!entry) return null;
    const [codArea] = entry;
    return (municipiosGeo.features as GeoJSONFeature[])?.find((f) => String(f.properties?.codarea) === codArea) || null;
  }, [municipiosGeo, selectedMunicipioName, municipioNames]);

  const stateGeo = useMemo(() => {
    if (!statesGeo || !selectedUF) return null;
    return (statesGeo.features as GeoJSONFeature[])?.find((f) => {
        const uf = getUFByCode(Number(f?.properties?.codarea));
        return uf && uf.sigla === selectedUF;
    }) || null;
  }, [statesGeo, selectedUF]);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const neighborhoodStyle = useCallback((_feature: unknown) => ({
    fillColor: "hsl(168, 60%, 40%)",
    weight: 1.5,
    opacity: 1,
    color: "hsl(168, 70%, 65%)",
    fillOpacity: 0.18,
    dashArray: "4 3",
  }), []);

  const stateStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const uf = getUFByCode(Number(f?.properties?.codarea));
    const isSelected = uf && selectedUF === uf.sigla;
    return {
      fillColor: isSelected ? "hsl(168, 70%, 45%)" : "hsl(220, 15%, 25%)",
      weight: isSelected ? 2 : 1.5,
      opacity: 1, 
      color: isSelected ? "hsl(var(--admin-sidebar-accent))" : "hsl(220, 15%, 35%)",
      fillOpacity: isSelected ? 0.15 : 0.6,
    };
  }, [selectedUF]);

  const municipioStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const blank = { fillColor: "hsl(220, 15%, 20%)", weight: 1, opacity: 0.6, color: "hsl(220, 15%, 28%)", fillOpacity: 0.4 };
    if (!municipioNames || !selectedUF) return blank;

    const codArea = f?.properties?.codarea;
    if (!codArea) return blank;
    const name = (municipioNames[String(codArea)] as string) || "";
    const reps = getMunicipioResponsaveis(name, selectedUF, modo, apiTerritories);

    // Only highlight if the search query is a specific word that matches name/rep
    // We avoid highlighting every polygon if the search is a broad address search
    if (searchQuery && searchQuery.length > 2) {
      const q = searchQuery.toLowerCase();
      const repNames = reps.map(c => apiReps.find(r => r.code === c)?.name || "").join(" ").toLowerCase();
      const isMatch = name.toLowerCase().includes(q) || reps.join(" ").toLowerCase().includes(q) || repNames.includes(q);
      
      if (isMatch) {
         // Fix "yellow screen" by reducing fillOpacity and removing fill if a client is selected
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
  }, [municipioNames, selectedUF, modo, filtroRepresentante, mostrarVagos, searchQuery, apiTerritories, apiReps, selectedClients]);

  const stateOutlineStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const uf = getUFByCode(Number(f?.properties?.codarea));
    const isSel = uf && selectedUF === uf.sigla;
    return {
      fillColor: "transparent" as const,
      weight: isSel ? 2 : 0.5,
      opacity: isSel ? 1 : 0.2,
      color: isSel ? "hsl(var(--admin-sidebar-accent))" : "hsl(220, 15%, 25%)",
      fillOpacity: 0
    };
  }, [selectedUF]);

  const targetMunicipioStyle = useCallback((feature: unknown) => {
    const f = feature as GeoJSONFeature;
    const codArea = f?.properties?.codarea;
    const name = (municipioNames?.[String(codArea)] as string) || "";
    const isTarget = name.toLowerCase() === (selectedMunicipioName || "").toLowerCase();
    return isTarget
      ? { fillColor: "transparent", weight: 2.5, opacity: 1, color: "hsl(168, 70%, 70%)", fillOpacity: 0 }
      : { fillColor: "transparent", weight: 0, opacity: 0, color: "transparent", fillOpacity: 0 };
  }, [municipioNames, selectedMunicipioName]);

  const onEachNeighborhood = useCallback((feature: unknown, layer: L.Layer) => {
    const f = feature as GeoJSONFeature;
    const nameList = [
      f.properties?.nome,
      f.properties?.name,
      f.properties?.NM_DIST,
      f.properties?.NM_SUBDIST
    ];
    const name = nameList.find(n => n) || "Bairro";
    layer.bindTooltip(`<strong>${name}</strong>`, { sticky: true, direction: "top" });
  }, []);

  // ── Event handlers ──────────────────────────────────────────────────────────
  const onEachState = useCallback((feature: unknown, layer: L.Layer) => {
    const f = feature as GeoJSONFeature;
    const uf = getUFByCode(Number(f?.properties?.codarea));
    if (!uf) return;

    if (layer instanceof L.Path) {
      const el = layer.getElement();
      if (el) el.classList.add('map-hover-effect');
    }

    (layer as L.Path).on({
      mouseover: (e) => { 
        e.target.bringToFront(); 
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
  }, [stateStyle, onSelectUF, onContextMenuState]);

  const onEachMunicipio = useCallback((feature: unknown, layer: L.Layer) => {
    const f = feature as GeoJSONFeature;
    if (!municipioNames || !selectedUF) return;
    const codArea = f?.properties?.codarea;
    if (!codArea) return;
    const name = (municipioNames[String(codArea)] as string) || `Município ${codArea}`;
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
        e.target.bringToFront(); 
        e.target.setStyle({ color: 'hsl(var(--admin-sidebar-accent))', fillOpacity: 0.6, weight: 3 });
        e.target.bindTooltip(tooltipHtml, { sticky: true }).openTooltip(); 
      },
      mouseout: (e) => { 
        e.target.setStyle(municipioStyle(f));
        e.target.closeTooltip(); 
      },
      click: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        onSelectMunicipio(name, selectedUF);
      },
      contextmenu: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        e.originalEvent.preventDefault();
        onContextMenuMunicipio?.(name, selectedUF, e.originalEvent.clientX, e.originalEvent.clientY);
      },
    });
  }, [municipioNames, selectedUF, modo, municipioStyle, onSelectMunicipio, apiTerritories, apiReps, onContextMenuMunicipio, role, estado_end]);

  // ── Neighborhood label markers — names are now baked into feature.properties.nome ───
  const markers: Array<{ center: L.LatLng; name: string }> = [];
  if (neighborhoodsGeo?.features) {
    for (const feature of neighborhoodsGeo.features) {
      const name = feature.properties?.nome
        || feature.properties?.name
        || feature.properties?.NM_DIST
        || feature.properties?.NM_SUBDIST
        || null;
      if (!name || !feature.geometry) continue;
      try {
        const bounds = L.geoJSON(feature).getBounds();
        if (bounds.isValid()) markers.push({ center: bounds.getCenter(), name });
      } catch { /* skip invalid geometry */ }
    }
  }


  // Filter clients: if UF is selected, show only that UF's clients and ensure they are within the state geometry.
  // If no UF is selected, show all clients that are within Brazil's boundaries.
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
      // For Brazil view, any point in any state is fine
      filterGeometry = statesGeo as unknown as GeoJSONFeatureCollection; 
    }

    return apiClientes.filter(c => {
      if (!c.latitude || !c.longitude) return false;
      if (selectedUF && c.uf !== selectedUF) return false;

      // If no UF is selected, we assume any geocoded client is "visible" in Brazil view.
      // This saves O(N * 27) polygon checks every render.
      if (!selectedUF) return true;

      // Point-in-polygon check (only when filtered by UF)
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

  const heatmapPoints: [number, number, number][] = showHeatmap 
    ? visibleClientes.map(c => [c.latitude!, c.longitude!, 1])
    : [];

  return (
    <div className="w-full h-full relative overflow-hidden bg-background">
      <AnimatePresence>
        {isMapMoving && <SpeedLinesOverlay active={true} />}
      </AnimatePresence>
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
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={0.5}
      >
        <AttributionControl prefix={false} />
        <MapController center={center} zoom={zoom} flyToLocation={flyToLocation} selectedUF={selectedUF} />
        <MapAnimationController 
          onMoveStart={() => setIsMapMoving(true)} 
          onMoveEnd={() => setIsMapMoving(false)} 
        />
        <MapEventHandler onBackgroundClick={() => selectedUF && onSelectUF("")} />

        {/* Auto-zoom to features when selected */}
        {munGeo && <ZoomToFeature geoJson={munGeo} maxZoom={13} />}
        {!munGeo && stateGeo && <ZoomToFeature geoJson={stateGeo} maxZoom={ufInfo?.zoom || 7} />}

        <TileLayer
          url={municipioCodeForBairros || flyToLocation
            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          }
          attribution="Desenvolvido por Lucas Ávila"
          opacity={municipioCodeForBairros || flyToLocation ? 1 : 0.4}
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

        {/* States */}
        {statesGeo && !selectedUF && (
          <GeoJSON key="states" data={statesGeo} style={stateStyle} onEachFeature={onEachState} />
        )}
        {statesGeo && selectedUF && (
          <GeoJSON key={`states-outline-${selectedUF}`} data={statesGeo} style={stateOutlineStyle} />
        )}

        {/* Municipalities */}
        {municipiosGeo && selectedUF && municipioNames && !municipioCodeForBairros && (
          <GeoJSON
            key={`muns-${selectedUF}-${modo}-${filtroRepresentante}-${mostrarVagos}-${searchQuery}-${apiTerritories.length}`}
            data={municipiosGeo} style={municipioStyle} onEachFeature={onEachMunicipio}
          />
        )}

        {/* ── Neighborhood mode ── */}
        {municipioCodeForBairros && (
          <>
            {/* Show selected municipality boundary only — no dark overlay */}
            {municipiosGeo && selectedUF && municipioNames && (
              <GeoJSON
                key={`muns-bg-${municipioCodeForBairros}`}
                data={municipiosGeo}
                style={targetMunicipioStyle}
              />
            )}

            {/* Neighborhood polygons */}
            {neighborhoodsGeo && (
              <GeoJSON
                key={`hoods-${municipioCodeForBairros}-${neighborhoodsGeo.features?.length ?? 0}`}
                data={neighborhoodsGeo}
                style={neighborhoodStyle}
                onEachFeature={onEachNeighborhood}
              />
            )}

            {/* Label markers on top of each neighborhood polygon */}
            {markers.map((m, i) => (
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
                  <span className="text-sm">Carregando bairros...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── Heatmap Layer ── */}
        {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

        {/* ── Client Pins ── */}
        {showClientes && visibleClientes.map((cliente) => {
          const isSelected = selectedClients.some(c => c.id_cliente === cliente.id_cliente);
          const rep = getRepByCode(cliente.repCode as string, apiReps);
          const repColor = rep ? getRepColor(rep) : "hsl(190, 100%, 50%)";
          
          return (
            <CircleMarker
              key={`cliente-${cliente.id_cliente}`}
              center={[cliente.latitude, cliente.longitude]}
              radius={isSelected ? 6 : 4}
              pathOptions={{
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
                }
              }}
            >
              <LeafletTooltip direction="top" className="custom-tooltip">
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
      </MapContainer>

      {/* Deactivate button */}
      <AnimatePresence>
        {municipioCodeForBairros && onDeactivateBairros && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="absolute top-4 left-4 z-[1000]"
          >
            <button
              onClick={onDeactivateBairros}
              className="flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-sm border border-border text-foreground text-xs font-semibold rounded-md shadow-lg hover:bg-secondary transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Voltar aos Municípios
            </button>
            {markers.length > 0 && (
              <div className="mt-2 px-3 py-1.5 bg-card/80 backdrop-blur-sm border border-border/50 rounded-md text-[10px] text-muted-foreground">
                {markers.length} bairro(s) carregado(s)
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible overlay to catch contextmenu on background */}
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
