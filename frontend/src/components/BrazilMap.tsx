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
import { getRepColor, getRepByCode, Representative } from "@/data/representatives";
import type { TerritoryAssignment } from "@/data/territories";

interface BrazilMapProps {
  selectedUF: string | null;
  modo: "planejamento" | "atendimento";
  filtroRepresentante: string | null;
  mostrarVagos: boolean;
  onSelectUF: (uf: string) => void;
  onSelectMunicipio: (municipio: string, uf: string) => void;
  searchQuery: string;
  municipioCodeForBairros?: number | null;
  onDeactivateBairros?: () => void;
  selectedMunicipioName?: string | null;
  showClientes: boolean;
  showHeatmap: boolean;
  onContextMenuState?: (nome: string, uf: string, x: number, y: number) => void;
  onContextMenuMunicipio?: (nome: string, uf: string, x: number, y: number) => void;
}

const API_BASE = "http://localhost:3001";

// ─── Map controller: smoothly fly to center/zoom ──────────────────────────
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; map.setView(center, zoom); }
    else map.flyTo(center, zoom, { duration: 2.5, easeLinearity: 0.25 });
  }, [map, center[0], center[1], zoom]);
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
function ZoomToMunicipio({ geoJson }: { geoJson: any }) {
  const map = useMap();
  useEffect(() => {
    if (!geoJson) return;
    try {
      const layer = L.geoJSON(geoJson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.flyToBounds(bounds, { padding: [40, 40], duration: 2.0, easeLinearity: 0.5, maxZoom: 13 });
    } catch { /* ignore */ }
  }, [geoJson, map]);
  return null;
}

// ─── Heatmap Layout component ──────────────────────────────────────────────
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const heatLayer = (L as any).heatLayer(points, {
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

// ─── API hooks ────────────────────────────────────────────────────────────────
function useApiRepresentatives() {
  return useQuery<Representative[]>({
    queryKey: ["api", "representatives"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/representatives`);
      return res.ok ? res.json() : [];
    },
    staleTime: 30_000, refetchInterval: 60_000,
  });
}

function useApiTerritories() {
  return useQuery<TerritoryAssignment[]>({
    queryKey: ["api", "territories"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/territories`);
      return res.ok ? res.json() : [];
    },
    staleTime: 30_000, refetchInterval: 60_000,
  });
}

function useApiClientes(repCode: string | null) {
  const { token } = useAuth();
  return useQuery<any[]>({
    queryKey: ["api", "clientes", repCode],
    queryFn: async () => {
      const url = repCode 
        ? `${API_BASE}/api/clientes?repCode=${repCode}`
        : `${API_BASE}/api/clientes`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok ? res.json() : [];
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}

// ─── Main BrazilMap Component ─────────────────────────────────────────────────
export default function BrazilMap({
  selectedUF, modo, filtroRepresentante, mostrarVagos,
  onSelectUF, onSelectMunicipio, searchQuery,
  municipioCodeForBairros, onDeactivateBairros, selectedMunicipioName, showClientes, showHeatmap,
  onContextMenuState, onContextMenuMunicipio,
}: BrazilMapProps) {
  const { role, estado_end } = useAuth();
  const { data: statesGeo } = useStatesGeoJSON();
  const { data: apiReps = [] } = useApiRepresentatives();
  const { data: apiTerritories = [] } = useApiTerritories();
  const { data: apiClientes = [] } = useApiClientes(filtroRepresentante);

  const ufInfo = selectedUF ? getUFBySigla(selectedUF) : null;
  const { data: municipiosGeo } = useMunicipiosGeoJSON(ufInfo?.codigo ?? null);
  const { data: municipioNames } = useMunicipioNames(ufInfo?.codigo ?? null);
  const { data: neighborhoodsGeo, isLoading: loadingNeighborhoods } = useNeighborhoodsGeoJSON(municipioCodeForBairros || null);

  const center: [number, number] = ufInfo ? ufInfo.center : [-14.2, -51.9];
  const zoom = ufInfo ? ufInfo.zoom : 4;

  // Find the selected municipality's GeoJSON feature for zoom-to-bounds
  const selectedMunicipioGeo = useCallback(() => {
    if (!municipiosGeo || !selectedMunicipioName || !municipioNames) return null;
    const entry = Object.entries(municipioNames).find(
      ([, name]) => (name as string).toLowerCase() === selectedMunicipioName.toLowerCase()
    );
    if (!entry) return null;
    const [codArea] = entry;
    return municipiosGeo.features?.find((f: any) => String(f.properties?.codarea) === codArea) || null;
  }, [municipiosGeo, selectedMunicipioName, municipioNames]);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const neighborhoodStyle = useCallback((_feature: any) => ({
    fillColor: "hsl(168, 60%, 40%)",
    weight: 1.5,
    opacity: 1,
    color: "hsl(168, 70%, 65%)",
    fillOpacity: 0.18,
    dashArray: "4 3",
  }), []);

  const stateStyle = useCallback((feature: any) => {
    const uf = getUFByCode(Number(feature?.properties?.codarea));
    const isSelected = uf && selectedUF === uf.sigla;
    return {
      fillColor: isSelected ? "hsl(168, 70%, 45%)" : "hsl(220, 15%, 25%)",
      weight: 1.5, opacity: 1, color: "hsl(220, 15%, 35%)",
      fillOpacity: isSelected ? 0.4 : 0.6,
    };
  }, [selectedUF]);

  const municipioStyle = useCallback((feature: any) => {
    const blank = { fillColor: "hsl(220, 15%, 20%)", weight: 1, opacity: 0.6, color: "hsl(220, 15%, 28%)", fillOpacity: 0.4 };
    if (!municipioNames || !selectedUF) return blank;

    const codArea = feature?.properties?.codarea;
    const name = municipioNames?.[codArea] || "";
    const reps = getMunicipioResponsaveis(name, selectedUF, modo, apiTerritories);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const repNames = reps.map(c => apiReps.find(r => r.code === c)?.name || "").join(" ").toLowerCase();
      if (!name.toLowerCase().includes(q) && !reps.join(" ").toLowerCase().includes(q) && !repNames.includes(q)) {
        return { fillColor: "transparent", weight: 0.5, opacity: 0.1, color: "hsl(220, 15%, 20%)", fillOpacity: 0 };
      }
      return { fillColor: "hsl(45, 90%, 55%)", weight: 3, opacity: 1, color: "hsl(45, 90%, 40%)", fillOpacity: 0.8 };
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
  }, [municipioNames, selectedUF, modo, filtroRepresentante, mostrarVagos, searchQuery, apiTerritories, apiReps]);

  // ── Event handlers ──────────────────────────────────────────────────────────
  const onEachState = useCallback((feature: any, layer: L.Layer) => {
    const uf = getUFByCode(Number(feature?.properties?.codarea));
    if (!uf) return;
    (layer as L.Path).on({
      mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.3, weight: 2.5 }); e.target.bindTooltip(uf.nome, { sticky: true }).openTooltip(); },
      mouseout: (e) => { e.target.setStyle(stateStyle(feature)); e.target.closeTooltip(); },
      click: (e: any) => {
        L.DomEvent.stopPropagation(e);
        onSelectUF(uf.sigla);
      },
      contextmenu: (e: any) => {
        L.DomEvent.stopPropagation(e);
        e.originalEvent.preventDefault();
        onContextMenuState?.(uf.nome, uf.sigla, e.originalEvent.clientX, e.originalEvent.clientY);
      },
    });
  }, [stateStyle, onSelectUF, onContextMenuState]);

  const onEachMunicipio = useCallback((feature: any, layer: L.Layer) => {
    if (!municipioNames || !selectedUF) return;
    const codArea = feature?.properties?.codarea;
    const name = municipioNames?.[codArea] || `Município ${codArea}`;
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

    (layer as L.Path).on({
      mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.8, weight: 3 }); e.target.bindTooltip(tooltipHtml, { sticky: true }).openTooltip(); e.target.bringToFront(); },
      mouseout: (e) => { e.target.setStyle(municipioStyle(feature)); e.target.closeTooltip(); },
      click: (e: any) => {
        L.DomEvent.stopPropagation(e);
        onSelectMunicipio(name, selectedUF);
      },
      contextmenu: (e: any) => {
        L.DomEvent.stopPropagation(e);
        e.originalEvent.preventDefault();
        onContextMenuMunicipio?.(name, selectedUF, e.originalEvent.clientX, e.originalEvent.clientY);
      },
    });
  }, [municipioNames, selectedUF, modo, municipioStyle, onSelectMunicipio, apiTerritories, apiReps, onContextMenuMunicipio]);

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

  const munGeo = selectedMunicipioGeo();

  // Filter clients: if UF is selected, show only that UF's clients and ensure they are within the state geometry.
  // If no UF is selected, show all clients that are within Brazil's boundaries.
  const visibleClientes = useMemo(() => {
    if (!(showClientes || showHeatmap) || !apiClientes || !statesGeo) return [];

    let filterGeometry: any = null;
    if (selectedUF) {
      const stateFeature = statesGeo.features?.find((f: any) => {
        const uf = getUFByCode(Number(f?.properties?.codarea));
        return uf && uf.sigla === selectedUF;
      });
      if (stateFeature) filterGeometry = stateFeature.geometry;
    } else {
      // For Brazil view, any point in any state is fine
      filterGeometry = statesGeo; 
    }

    return apiClientes.filter(c => {
      if (!c.latitude || !c.longitude) return false;
      if (selectedUF && c.uf !== selectedUF) return false;

      // Point-in-polygon check
      try {
        const pt = turfPoint([c.longitude, c.latitude]);
        if (filterGeometry) {
          if (filterGeometry.type === 'FeatureCollection') {
            return filterGeometry.features.some((f: any) => {
              try {
                return f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') && booleanPointInPolygon(pt, f);
              } catch {
                return false; 
              }
            });
          }
          return booleanPointInPolygon(pt, filterGeometry);
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
    <div className="w-full h-full relative">
      <MapContainer
        center={center} zoom={zoom}
        className="w-full h-full"
        zoomControl={true} attributionControl={false}
        style={{ background: "hsl(220, 20%, 8%)" }}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <AttributionControl prefix={false} />
        <MapController center={center} zoom={zoom} />
        <MapEventHandler onBackgroundClick={() => selectedUF && onSelectUF("")} />

        {/* Auto-zoom to municipality when selected */}
        {munGeo && <ZoomToMunicipio geoJson={munGeo} />}

        <TileLayer
          url={municipioCodeForBairros
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          }
          attribution="Desenvolvido por Lucas Ávila"
          opacity={municipioCodeForBairros ? 1 : 0.4}
        />

        {/* States */}
        {statesGeo && !selectedUF && (
          <GeoJSON key="states" data={statesGeo} style={stateStyle} onEachFeature={onEachState} />
        )}
        {statesGeo && selectedUF && (
          <GeoJSON key={`states-outline-${selectedUF}`} data={statesGeo} style={(f) => {
            const uf = getUFByCode(Number(f?.properties?.codarea));
            const isSel = uf && selectedUF === uf.sigla;
            return { fillColor: "transparent", weight: isSel ? 2 : 0.5, opacity: isSel ? 1 : 0.2, color: isSel ? "hsl(168, 70%, 45%)" : "hsl(220, 15%, 25%)", fillOpacity: 0 };
          }} />
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
                style={(f) => {
                  const codArea = f?.properties?.codarea;
                  const name = municipioNames?.[codArea] || "";
                  const isTarget = name.toLowerCase() === (selectedMunicipioName || "").toLowerCase();
                  return isTarget
                    ? { fillColor: "transparent", weight: 2.5, opacity: 1, color: "hsl(168, 70%, 70%)", fillOpacity: 0 }
                    : { fillColor: "transparent", weight: 0, opacity: 0, color: "transparent", fillOpacity: 0 };
                }}
              />
            )}

            {/* Neighborhood polygons */}
            {neighborhoodsGeo && (
              <GeoJSON
                key={`hoods-${municipioCodeForBairros}-${neighborhoodsGeo.features?.length ?? 0}`}
                data={neighborhoodsGeo}
                style={neighborhoodStyle}
                onEachFeature={(feature, layer) => {
                  const name = feature.properties?.nome
                    || feature.properties?.name
                    || feature.properties?.NM_DIST
                    || feature.properties?.NM_SUBDIST
                    || "Bairro";
                  layer.bindTooltip(`<strong>${name}</strong>`, { sticky: true, direction: "top" });
                }}
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
        {showClientes && visibleClientes.map((cliente) => (
          <CircleMarker
            key={`cliente-${cliente.id_cliente}`}
            center={[cliente.latitude, cliente.longitude]}
            radius={4}
            pathOptions={{
              fillColor: "hsl(190, 100%, 50%)",
              color: "hsl(190, 100%, 30%)",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.9
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
        ))}
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
      `}</style>
    </div>
  );
}
