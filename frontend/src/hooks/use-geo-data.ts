import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api-base";
import { useAuth } from "@/contexts/auth-context-core";

const API_BASE = `${API_BASE_URL}/api/location`;
const IBGE_MALHAS = "https://servicodados.ibge.gov.br/api/v3/malhas";
const IBGE_LOC = "https://servicodados.ibge.gov.br/api/v1/localidades";

// ── Metadata Hooks (Brasil Aberto via Backend) ────────────────────────────────

export function useStatesMetadata() {
  const { token, tokenVersion } = useAuth();
  return useQuery({
    queryKey: ["location", "states"],
    queryFn: () => fetch(`${API_BASE}/states`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-user-token-version': String(tokenVersion || 0)
      }
    }).then(r => r.json()),
    staleTime: Infinity,
    enabled: !!token
  });
}

export function useCitiesMetadata(ufSigla: string | null) {
  const { token, tokenVersion } = useAuth();
  return useQuery({
    queryKey: ["location", "cities", ufSigla],
    queryFn: () => fetch(`${API_BASE}/cities/${ufSigla}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-user-token-version': String(tokenVersion || 0)
      }
    }).then(r => r.json()),
    enabled: !!ufSigla && !!token,
    staleTime: Infinity,
  });
}

export function useDistrictsMetadata(ibgeCode: number | null) {
  const { token, tokenVersion } = useAuth();
  return useQuery({
    queryKey: ["location", "districts", ibgeCode],
    queryFn: () => fetch(`${API_BASE}/districts/${ibgeCode}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-user-token-version': String(tokenVersion || 0)
      }
    }).then(r => r.json()),
    enabled: !!ibgeCode && !!token,
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
    queryKey: ["geo", "neighborhoods-v6", municipioCode, municipioName, ufSigla],
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

        if (localities.length > 0) {
          const featureRequests = localities.map(async (loc) => {
            try {
              const url = `${IBGE_MALHAS}/${level}/${loc.id}?formato=application/vnd.geo+json&qualidade=minima`;
              const res = await fetch(url);
              if (!res.ok) return null;
              const data = await res.json();
              const feats = Array.isArray(data?.features) ? data.features : [];
              if (feats.length === 0) return null;

              const withProps = feats
                .filter((feat: { geometry?: { type?: string } }) =>
                  feat?.geometry?.type === "Polygon" || feat?.geometry?.type === "MultiPolygon"
                )
                .map((feat: { properties?: Record<string, unknown> }) => ({
                  ...feat,
                  properties: { ...(feat.properties || {}), nome: loc.nome, localidadeId: loc.id }
                }));

              return withProps.length > 0 ? withProps : null;
            } catch { return null; }
          });
          const allFeatures = (await Promise.all(featureRequests))
            .flat()
            .filter(Boolean);
          if (allFeatures.length > 0) return { type: "FeatureCollection" as const, features: allFeatures };
        }
      } catch (e) { console.warn("IBGE polygons failed", e); }

      // Step 2: Fallback to Overpass API for polygons
      // Primary query: locate municipality by IBGE code in OSM, then fetch
      // admin_level=10 boundaries (neighborhood-like divisions) inside it.
      try {
        const byIbgeQuery = `[out:json][timeout:60];
rel["boundary"="administrative"]["admin_level"="8"]["ref:IBGE"="${municipioCode}"]->.m;
map_to_area .m->.searchArea;
(
  rel["boundary"="administrative"]["admin_level"="10"](area.searchArea);
  way["boundary"="administrative"]["admin_level"="10"](area.searchArea);
  rel["place"~"suburb|neighbourhood"](area.searchArea);
  way["place"~"suburb|neighbourhood"](area.searchArea);
);
out geom;`;
        const overpassByIbgeUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(byIbgeQuery)}`;
        const byIbgeRes = await fetch(overpassByIbgeUrl);
        if (byIbgeRes.ok) {
          const byIbgeData = await byIbgeRes.json();
          if (byIbgeData?.elements?.length > 0) {
            const features = byIbgeData.elements.map((el: {
              type: string;
              id: number;
              tags: { name?: string };
              geometry?: { lat: number; lon: number }[];
              members?: { type: string; geometry: { lat: number; lon: number }[] }[];
            }) => {
              const coordinates = el.type === "way"
                ? [el.geometry?.map(g => [g.lon, g.lat]) || []]
                : (el.members
                  ?.filter(m => m.type === "way" && m.geometry && m.geometry.length > 2)
                  .map(m => [m.geometry?.map(g => [g.lon, g.lat]) || []]) || []);

              if (el.type === "way" && coordinates[0].length < 3) return null;
              if (el.type !== "way" && coordinates.length === 0) return null;

              return {
                type: "Feature" as const,
                properties: { nome: el.tags?.name || "Bairro", osm_id: el.id },
                geometry: {
                  type: el.type === "way" ? "Polygon" as const : "MultiPolygon" as const,
                  coordinates: coordinates as number[][][] | number[][][][]
                }
              };
            });

            const validFeatures = features.filter(Boolean);
            if (validFeatures.length > 0) {
              return { type: "FeatureCollection" as const, features: validFeatures };
            }
          }
        }
      } catch (e) { console.warn("Overpass IBGE fallback failed", e); }

      // Secondary query by municipality name + UF when ref:IBGE is unavailable
      if (municipioName && ufSigla) {
        try {
          const query = `[out:json][timeout:60];area["name"="${municipioName}"]["boundary"="administrative"]["admin_level"~"8|9"]->.searchArea;(rel["place"~"suburb|neighbourhood"](area.searchArea);way["place"~"suburb|neighbourhood"](area.searchArea);rel["boundary"="administrative"]["admin_level"="10"](area.searchArea);way["boundary"="administrative"]["admin_level"="10"](area.searchArea););out geom;`;
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
                  : (el.members
                    ?.filter(m => m.type === 'way' && m.geometry && m.geometry.length > 2)
                    .map(m => [m.geometry?.map(g => [g.lon, g.lat]) || []]) || []);

                if (el.type === 'way' && coordinates[0].length < 3) return null;
                if (el.type !== 'way' && coordinates.length === 0) return null;

                return {
                  type: "Feature" as const,
                  properties: { nome: el.tags.name || "Bairro", osm_id: el.id },
                  geometry: {
                    type: el.type === 'way' ? "Polygon" as const : "MultiPolygon" as const,
                    coordinates: coordinates as number[][][] | number[][][][]
                  }
                };
              });
              const validFeatures = features.filter(Boolean);
              if (validFeatures.length > 0) {
                return { type: "FeatureCollection" as const, features: validFeatures };
              }
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
