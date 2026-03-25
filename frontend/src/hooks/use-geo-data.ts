import { useQuery } from "@tanstack/react-query";

const API_BASE = "http://localhost:3001/api/location";
const IBGE_MALHAS = "https://servicodados.ibge.gov.br/api/v3/malhas";
const IBGE_LOC = "https://servicodados.ibge.gov.br/api/v1/localidades";

// ── Metadata Hooks (Brasil Aberto via Backend) ────────────────────────────────

export function useStatesMetadata() {
  return useQuery({
    queryKey: ["location", "states"],
    queryFn: () => fetch(`${API_BASE}/states`).then(r => r.json()),
    staleTime: Infinity,
  });
}

export function useCitiesMetadata(ufSigla: string | null) {
  return useQuery({
    queryKey: ["location", "cities", ufSigla],
    queryFn: () => fetch(`${API_BASE}/cities/${ufSigla}`).then(r => r.json()),
    enabled: !!ufSigla,
    staleTime: Infinity,
  });
}

export function useDistrictsMetadata(ibgeCode: number | null) {
  return useQuery({
    queryKey: ["location", "districts", ibgeCode],
    queryFn: () => fetch(`${API_BASE}/districts/${ibgeCode}`).then(r => r.json()),
    enabled: !!ibgeCode,
    staleTime: Infinity,
  });
}

// ── GeoJSON Hooks (Visual Fallback Layer) ─────────────────────────────────────

export function useStatesGeoJSON() {
  return useQuery({
    queryKey: ["geo", "states"],
    queryFn: () => fetch(
      `${IBGE_MALHAS}/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF`
    ).then(r => r.json()),
    staleTime: Infinity,
  });
}

export function useMunicipiosGeoJSON(ufCode: number | null) {
  return useQuery({
    queryKey: ["geo", "municipios", ufCode],
    queryFn: () => fetch(
      `${IBGE_MALHAS}/estados/${ufCode}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`
    ).then(r => r.json()),
    enabled: !!ufCode,
    staleTime: Infinity,
  });
}

export function useNeighborhoodsGeoJSON(municipioCode: number | null, municipioName?: string, ufSigla?: string) {
  return useQuery({
    queryKey: ["geo", "neighborhoods-v5", municipioCode, municipioName, ufSigla],
    queryFn: async () => {
      if (!municipioCode) return null;

      // Try districts from our backend (Brasil Aberto) first for metadata, 
      // but we still need polygons from IBGE/OSM.
      
      // Step 1: Try IBGE Subdivisions for polygons
      try {
        const [subsRes, distsRes] = await Promise.all([
          fetch(`${IBGE_LOC}/municipios/${municipioCode}/subdistritos`),
          fetch(`${IBGE_LOC}/municipios/${municipioCode}/distritos`),
        ]);
        const [subs, dists] = await Promise.all([
          subsRes.ok ? subsRes.json() : [],
          distsRes.ok ? distsRes.json() : [],
        ]);
        const localities = subs.length > 0 ? subs : dists;
        const level = subs.length > 0 ? "subdistritos" : "distritos";

        if (localities.length > 1) {
          const featureRequests = localities.map(async (loc) => {
            try {
              const url = `${IBGE_MALHAS}/${level}/${loc.id}?formato=application/vnd.geo+json&qualidade=minima`;
              const res = await fetch(url);
              if (!res.ok) return null;
              const data = await res.json();
              const feat = data?.features?.[0];
              if (!feat) return null;
              feat.properties = { ...feat.properties, nome: loc.nome, localidadeId: loc.id };
              return feat;
            } catch { return null; }
          });
          const allFeatures = (await Promise.all(featureRequests)).filter(Boolean);
          if (allFeatures.length > 0) return { type: "FeatureCollection" as const, features: allFeatures };
        }
      } catch (e) { console.warn("IBGE polygons failed", e); }

      // Step 2: Fallback to Overpass API for polygons
      if (municipioName && ufSigla) {
        try {
          const query = `[out:json][timeout:25];area["name"="${municipioName}"]["admin_level"~"4|8"]->.searchArea;(rel["place"~"suburb|neighbourhood"](area.searchArea);way["place"~"suburb|neighbourhood"](area.searchArea););out geom;`;
          const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
          const res = await fetch(overpassUrl);
          if (res.ok) {
            const data = await res.json();
            if (data?.elements?.length > 0) {
              const features = data.elements.map((el: { 
                type: string; 
                id: number; 
                tags: { name?: string }; 
                geometry?: { lat: number; lon: number }[]; 
                members?: { type: string; geometry: { lat: number; lon: number }[] }[] 
              }) => {
                const coordinates = el.type === 'way' 
                  ? [el.geometry?.map(g => [g.lon, g.lat]) || []]
                  : el.members?.filter(m => m.type === 'way' && m.geometry).map(m => m.geometry?.map(g => [g.lon, g.lat]) || []) || [];
                return {
                  type: "Feature" as const,
                  properties: { nome: el.tags.name || "Bairro", osm_id: el.id },
                  geometry: {
                    type: el.type === 'way' ? "Polygon" as const : "MultiPolygon" as const,
                    coordinates: coordinates as number[][][] | number[][][][]
                  }
                };
              });
              return { type: "FeatureCollection" as const, features };
            }
          }
        } catch (e) { console.warn("Overpass fallback failed", e); }
      }
      return null;
    },
    enabled: !!municipioCode,
    staleTime: Infinity,
  });
}

// ── Compatibility hooks ───────────────────────────────────────────────────────

export function useMunicipioNames(ufCode: number | null) {
  // Compatibility hook for style mapping — uses IBGE directly
  return useQuery({
    queryKey: ["ibge", "municipios", ufCode],
    queryFn: async () => {
      const res = await fetch(`${IBGE_LOC}/estados/${ufCode}/municipios`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const map: Record<string, string> = {};
      data.forEach((m: { id: number | string; nome: string }) => { map[String(m.id)] = m.nome; });
      return map;
    },
    enabled: !!ufCode,
    staleTime: Infinity,
  });
}

/** Compatibility hook for DetailPanel: returns list of { id, nome } for a given UF code */
export function useMunicipioInfo(ufCode: number | null) {
  return useQuery({
    queryKey: ["ibge", "municipios-info", ufCode],
    queryFn: async () => {
      const res = await fetch(`${IBGE_LOC}/estados/${ufCode}/municipios`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ id: number; nome: string }[]>;
    },
    enabled: !!ufCode,
    staleTime: Infinity,
  });
}
