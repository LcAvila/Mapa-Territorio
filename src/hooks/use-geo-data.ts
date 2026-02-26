import { useQuery } from "@tanstack/react-query";

const IBGE_MALHAS = "https://servicodados.ibge.gov.br/api/v3/malhas";
const IBGE_LOC = "https://servicodados.ibge.gov.br/api/v1/localidades";

// ── States GeoJSON ────────────────────────────────────────────────────────────
export function useStatesGeoJSON() {
  return useQuery({
    queryKey: ["geo", "states"],
    queryFn: () => fetch(
      `${IBGE_MALHAS}/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF`
    ).then(r => r.json()),
    staleTime: Infinity,
  });
}

// ── All municipalities in a state ─────────────────────────────────────────────
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

// ── Neighborhood GeoJSON — fetches each district/subdistrito individually ──────
// This guarantees names are embedded in each feature, regardless of the Malhas
// intrarregiao endpoint reliability.
export function useNeighborhoodsGeoJSON(municipioCode: number | null) {
  return useQuery({
    queryKey: ["geo", "neighborhoods-v2", municipioCode],
    queryFn: async () => {
      if (!municipioCode) return null;

      // Step 1: Get the list of administrative subdivisions (prefer subdistritos → distritos)
      const [subsRes, distsRes] = await Promise.all([
        fetch(`${IBGE_LOC}/municipios/${municipioCode}/subdistritos`),
        fetch(`${IBGE_LOC}/municipios/${municipioCode}/distritos`),
      ]);

      const [subs, dists] = await Promise.all([
        subsRes.ok ? subsRes.json() : [],
        distsRes.ok ? distsRes.json() : [],
      ]);

      // Use subdistritos if they exist, otherwise distritos
      const localities: Array<{ id: number; nome: string }> = subs.length > 0 ? subs : dists;
      const level = subs.length > 0 ? "subdistritos" : "distritos";

      if (localities.length === 0) {
        // No subdivisions found — just return municipality outline with its name
        const res = await fetch(
          `${IBGE_MALHAS}/municipios/${municipioCode}?formato=application/vnd.geo+json`
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.features?.[0]) {
          // We have at least the municipality boundary; no subdivision possible
          data.features[0].properties = {
            ...data.features[0].properties,
            nome: "Área Municipal",
            isMunicipality: true,
          };
        }
        return localities.length === 0 ? null : data;
      }

      // Step 2: Fetch GeoJSON for each locality individually (parallel)
      const featureRequests = localities.map(async (loc) => {
        try {
          const url = `${IBGE_MALHAS}/${level}/${loc.id}?formato=application/vnd.geo+json&qualidade=minima`;
          const res = await fetch(url);
          if (!res.ok) return null;
          const data = await res.json();
          const feat = data?.features?.[0];
          if (!feat) return null;
          // Embed the name and id directly into the feature properties
          feat.properties = {
            ...feat.properties,
            nome: loc.nome,
            localidadeId: loc.id,
          };
          return feat;
        } catch {
          return null;
        }
      });

      const allFeatures = (await Promise.all(featureRequests)).filter(Boolean);

      if (allFeatures.length === 0) return null;

      return {
        type: "FeatureCollection" as const,
        features: allFeatures,
      };
    },
    enabled: !!municipioCode,
    staleTime: Infinity,
    retry: 1,
  });
}

// ── Municipality names: id → name map (for coloring the map) ─────────────────
export function useMunicipioNames(ufCode: number | null) {
  return useQuery({
    queryKey: ["ibge", "municipios", ufCode],
    queryFn: async () => {
      const res = await fetch(`${IBGE_LOC}/estados/${ufCode}/municipios`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const map: Record<string, string> = {};
      data.forEach((m: any) => { map[String(m.id)] = m.nome; });
      return map;
    },
    enabled: !!ufCode,
    staleTime: Infinity,
  });
}

// ── Subdistrito names: kept for compatibility (names now embedded in GeoJSON) ─
export function useSubdistritoNames(_municipioCode: number | null) {
  // Names are now embedded directly in feature.properties.nome via useNeighborhoodsGeoJSON
  // This hook is kept for backward compatibility but returns an empty object
  return { data: {} as Record<string, string> };
}

// ── Full municipality list for a state (used to find IBGE IDs from names) ────
export function useMunicipioInfo(ufCode: number | null) {
  return useQuery({
    queryKey: ["ibge", "municipio-info", ufCode],
    queryFn: async () => {
      const res = await fetch(`${IBGE_LOC}/estados/${ufCode}/municipios`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!ufCode,
    staleTime: Infinity,
  });
}
