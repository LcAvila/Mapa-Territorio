import { Search, ChevronDown, MapPin, RotateCcw } from "lucide-react";
import { useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, AttributionControl, CircleMarker, Tooltip } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useStatesGeoJSON, useMunicipiosGeoJSON, useMunicipioNames, useNeighborhoodsGeoJSON, useSubdistritoNames } from "@/hooks/use-geo-data";
import { getUFByCode, getUFBySigla } from "@/data/uf-codes";
import { getMunicipioResponsaveis } from "@/data/territories";
import { getRepByCode, getRepColor } from "@/data/representatives";

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
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      map.setView(center, zoom);
    } else {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [map, center[0], center[1], zoom]);

  return null;
}

export default function BrazilMap({
  selectedUF,
  modo,
  filtroRepresentante,
  mostrarVagos,
  onSelectUF,
  onSelectMunicipio,
  searchQuery,
  municipioCodeForBairros,
  onDeactivateBairros,
}: BrazilMapProps) {
  const { data: statesGeo } = useStatesGeoJSON();

  const ufInfo = selectedUF ? getUFBySigla(selectedUF) : null;
  const { data: municipiosGeo } = useMunicipiosGeoJSON(ufInfo?.codigo ?? null);
  const { data: municipioNames } = useMunicipioNames(ufInfo?.codigo ?? null);
  const { data: neighborhoodsGeo } = useNeighborhoodsGeoJSON(municipioCodeForBairros || null);
  const { data: subdistritoNames } = useSubdistritoNames(municipioCodeForBairros || null);

  const center: [number, number] = ufInfo ? ufInfo.center : [-14.2, -51.9];
  const zoom = municipioCodeForBairros ? 11 : (ufInfo ? ufInfo.zoom : 4);

  const neighborhoodStyle = useCallback((feature: any) => {
    return {
      fillColor: "hsl(168, 70%, 45%)",
      weight: 1.5,
      opacity: 1,
      color: "hsl(168, 70%, 35%)",
      fillOpacity: 0.15,
      dashArray: "3",
    };
  }, []);

  const stateStyle = useCallback((feature: any) => {
    const codUF = feature?.properties?.codarea;
    const uf = codUF ? getUFByCode(Number(codUF)) : null;
    const isSelected = uf && selectedUF === uf.sigla;

    return {
      fillColor: isSelected ? "hsl(168, 70%, 45%)" : "hsl(220, 15%, 25%)",
      weight: 1.5,
      opacity: 1,
      color: "hsl(220, 15%, 35%)",
      fillOpacity: isSelected ? 0.4 : 0.6,
    };
  }, [selectedUF]);

  const municipioStyle = useCallback((feature: any) => {
    if (!municipioNames || !selectedUF) return {
      fillColor: "hsl(220, 15%, 25%)",
      weight: 1,
      opacity: 0.8,
      color: "hsl(220, 15%, 30%)",
      fillOpacity: 0.5,
    };

    const codArea = feature?.properties?.codarea;
    const name = municipioNames?.[codArea] || "";

    const reps = getMunicipioResponsaveis(name, selectedUF, modo);

    if (reps.length === 0) {
      return {
        fillColor: "hsl(220, 15%, 20%)",
        weight: 1,
        opacity: 0.6,
        color: "hsl(220, 15%, 28%)",
        fillOpacity: 0.4,
      };
    }

    const mainRepCode = reps[0];
    const rep = getRepByCode(mainRepCode);

    if (!rep) {
      return {
        fillColor: "hsl(220, 15%, 25%)",
        weight: 1,
        opacity: 0.6,
        color: "hsl(220, 15%, 28%)",
        fillOpacity: 0.4,
      };
    }

    // Search filter logic
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const repsStr = reps.join(" ").toLowerCase();
      if (!name.toLowerCase().includes(q) && !repsStr.includes(q)) {
        return {
          fillColor: "transparent",
          weight: 0.5,
          opacity: 0.1,
          color: "hsl(220, 15%, 20%)",
          fillOpacity: 0,
        };
      }
      // Highlight search result
      return {
        fillColor: "hsl(45, 90%, 55%)",
        weight: 3,
        opacity: 1,
        color: "hsl(45, 90%, 40%)",
        fillOpacity: 0.8,
      };
    }

    // Filter logic
    if (filtroRepresentante && !reps.includes(filtroRepresentante)) {
      return {
        fillColor: "hsl(220, 15%, 15%)",
        weight: 0.5,
        opacity: 0.3,
        color: "hsl(220, 15%, 20%)",
        fillOpacity: 0.2,
      };
    }

    if (mostrarVagos && !rep.isVago) {
      return {
        fillColor: "hsl(220, 15%, 15%)",
        weight: 0.5,
        opacity: 0.3,
        color: "hsl(220, 15%, 20%)",
        fillOpacity: 0.2,
      };
    }

    const color = getRepColor(rep);
    const isVago = rep.isVago;

    return {
      fillColor: color,
      weight: isVago ? 2 : 1.5,
      opacity: 1,
      color: isVago ? "hsl(0, 70%, 50%)" : color,
      fillOpacity: isVago ? 0.3 : 0.55,
      dashArray: isVago ? "6 4" : undefined,
    };
  }, [municipioNames, selectedUF, modo, filtroRepresentante, mostrarVagos, searchQuery]);

  const onEachState = useCallback((feature: any, layer: L.Layer) => {
    const codUF = feature?.properties?.codarea;
    const uf = codUF ? getUFByCode(Number(codUF)) : null;

    if (uf) {
      (layer as L.Path).on({
        mouseover: (e) => {
          const l = e.target;
          l.setStyle({ fillOpacity: 0.3, weight: 2.5 });
          l.bindTooltip(uf.nome, { sticky: true, className: "leaflet-tooltip-custom" }).openTooltip();
        },
        mouseout: (e) => {
          const l = e.target;
          l.setStyle(stateStyle(feature));
          l.closeTooltip();
        },
        click: () => {
          onSelectUF(uf.sigla);
        },
      });
    }
  }, [stateStyle, onSelectUF]);

  const onEachMunicipio = useCallback((feature: any, layer: L.Layer) => {
    if (!municipioNames || !selectedUF) return;

    const codArea = feature?.properties?.codarea;
    const name = municipioNames?.[codArea] || `Município ${codArea}`;
    const reps = getMunicipioResponsaveis(name, selectedUF, modo);
    const repNames = reps.map(code => {
      const r = getRepByCode(code);
      return r ? `${r.code} - ${r.name}` : code;
    });

    const tooltipContent = reps.length > 0
      ? `<strong>${name}</strong><br/>${repNames.join("<br/>")}`
      : `<strong>${name}</strong><br/><em>Sem responsável</em>`;

    (layer as L.Path).on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.8, weight: 3 });
        l.bindTooltip(tooltipContent, { sticky: true }).openTooltip();
        l.bringToFront();
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle(municipioStyle(feature));
        l.closeTooltip();
      },
      click: () => {
        onSelectMunicipio(name, selectedUF);
      },
    });
  }, [municipioNames, selectedUF, modo, municipioStyle, onSelectMunicipio]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={true}
        attributionControl={false}
        style={{ background: "hsl(220, 20%, 8%)" }}
      >
        <AttributionControl prefix={false} />
        <MapController center={center} zoom={zoom} />

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution="Desenvolvido por Lucas Ávila"
          opacity={0.4}
        />

        {/* States layer - always show */}
        {statesGeo && !selectedUF && (
          <GeoJSON
            key="states"
            data={statesGeo}
            style={stateStyle}
            onEachFeature={onEachState}
          />
        )}

        {/* States outline when UF selected */}
        {statesGeo && selectedUF && (
          <GeoJSON
            key={`states-outline-${selectedUF}`}
            data={statesGeo}
            style={(feature) => {
              const codUF = feature?.properties?.codarea;
              const uf = codUF ? getUFByCode(Number(codUF)) : null;
              const isSelected = uf && selectedUF === uf.sigla;
              return {
                fillColor: "transparent",
                weight: isSelected ? 2 : 0.5,
                opacity: isSelected ? 1 : 0.2,
                color: isSelected ? "hsl(168, 70%, 45%)" : "hsl(220, 15%, 25%)",
                fillOpacity: 0,
              };
            }}
          />
        )}

        {/* Municipalities layer */}
        {municipiosGeo && selectedUF && municipioNames && !municipioCodeForBairros && (
          <GeoJSON
            key={`municipios-${selectedUF}-${modo}-${filtroRepresentante}-${mostrarVagos}-${searchQuery}`}
            data={municipiosGeo}
            style={municipioStyle}
            onEachFeature={onEachMunicipio}
          />
        )}

        {/* Neighborhoods layer */}
        {neighborhoodsGeo && municipioCodeForBairros && (
          <GeoJSON
            key={`neighborhoods-${municipioCodeForBairros}`}
            data={neighborhoodsGeo}
            style={neighborhoodStyle}
            onEachFeature={(feature, layer) => {
              const codArea = feature.properties?.codarea;
              const name = (subdistritoNames && codArea) ? subdistritoNames[codArea] : (feature.properties?.name || feature.properties?.nome || "Bairro");
              layer.bindTooltip(`<strong>${name}</strong>`, { sticky: true, permanent: false, direction: "top" });
            }}
          />
        )}

        {/* Neighborhood Markers/Names Fallback */}
        {municipioCodeForBairros && subdistritoNames && (
          <>
            {Object.entries(subdistritoNames).map(([id, name]) => {
              const feature = neighborhoodsGeo?.features?.find((f: any) => f.properties?.codarea === id);
              if (feature && feature.geometry) {
                const bounds = L.geoJSON(feature).getBounds();
                const center = bounds.getCenter();

                return (
                  <CircleMarker
                    key={`marker-${id}`}
                    center={center}
                    radius={4}
                    pathOptions={{ color: 'hsl(168, 70%, 45%)', fillOpacity: 0.8 }}
                  >
                    <Tooltip permanent={true} direction="center" className="neighborhood-label">
                      {name}
                    </Tooltip>
                  </CircleMarker>
                );
              }
              return null;
            })}
          </>
        )}
      </MapContainer>

      {/* Deactivate Bairros Button overlay */}
      {municipioCodeForBairros && onDeactivateBairros && (
        <div className="absolute top-20 right-4 z-[1000]">
          <button
            onClick={onDeactivateBairros}
            className="flex items-center gap-2 px-3 py-2 bg-secondary/90 backdrop-blur-sm border border-border text-foreground text-xs font-semibold rounded-md shadow-lg hover:bg-secondary transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Desativar Visão de Bairros
          </button>
        </div>
      )}
    </div>
  );
}
