import { useQuery } from "@tanstack/react-query";

const IBGE_BASE = "https://servicodados.ibge.gov.br/api/v3/malhas";

async function fetchGeoJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch GeoJSON: ${res.status}`);
  return res.json();
}

export function useStatesGeoJSON() {
  return useQuery({
    queryKey: ["geo", "states"],
    queryFn: () => fetchGeoJSON(
      `${IBGE_BASE}/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF`
    ),
    staleTime: Infinity,
  });
}

export function useMunicipiosGeoJSON(ufCode: number | null) {
  return useQuery({
    queryKey: ["geo", "municipios", ufCode],
    queryFn: () => fetchGeoJSON(
      `${IBGE_BASE}/estados/${ufCode}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`
    ),
    enabled: !!ufCode,
    staleTime: Infinity,
  });
}

// Subdistritos (Bairros) for a municipality - Using multiple fallbacks
export function useNeighborhoodsGeoJSON(municipioCode: number | null) {
  return useQuery({
    queryKey: ["geo", "neighborhoods", municipioCode],
    queryFn: async () => {
      if (!municipioCode) return null;

      const attempts = [
        // Attempt 1: Subdistritos for the municipality
        `${IBGE_BASE}/municipios/${municipioCode}?formato=application/vnd.geo+json&intrarregiao=subdistrito`,
        // Attempt 2: Distritos for the municipality
        `${IBGE_BASE}/municipios/${municipioCode}?formato=application/vnd.geo+json&intrarregiao=distrito`,
        // Attempt 3: The municipality boundary itself (as container)
        `${IBGE_BASE}/municipios/${municipioCode}?formato=application/vnd.geo+json`
      ];

      for (const url of attempts) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data && data.features && data.features.length > 0) {
              return data;
            }
          }
        } catch (e) {
          console.error(`Failed to fetch from ${url}:`, e);
        }
      }

      return null;
    },
    enabled: !!municipioCode,
    staleTime: Infinity,
  });
}

// Fetch subdistrito names to map codarea -> name
export function useSubdistritoNames(municipioCode: number | null) {
  return useQuery({
    queryKey: ["ibge", "subdistrito-names", municipioCode],
    queryFn: async () => {
      // Fetch both subdistritos and distritos names
      const [subsRes, distsRes] = await Promise.all([
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${municipioCode}/subdistritos`),
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${municipioCode}/distritos`)
      ]);

      const [subs, dists] = await Promise.all([
        subsRes.ok ? subsRes.json() : [],
        distsRes.ok ? distsRes.json() : []
      ]);

      const map: Record<string, string> = {};
      [...subs, ...dists].forEach((item: any) => {
        map[String(item.id)] = item.nome;
      });
      return map;
    },
    enabled: !!municipioCode,
    staleTime: Infinity,
  });
}

// Fetch municipality names from IBGE
export function useMunicipioNames(ufCode: number | null) {
  return useQuery({
    queryKey: ["ibge", "municipios", ufCode],
    queryFn: async () => {
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufCode}/municipios`
      );
      if (!res.ok) throw new Error("Failed to fetch municipios");
      const data = await res.json();
      // Return a map: id -> name
      const map: Record<string, string> = {};
      data.forEach((m: any) => {
        map[String(m.id)] = m.nome;
      });
      return map;
    },
    enabled: !!ufCode,
    staleTime: Infinity,
  });
}

// Get specific municipality info (for getting its code from its name)
export function useMunicipioInfo(ufCode: number | null) {
  return useQuery({
    queryKey: ["ibge", "municipio-info", ufCode],
    queryFn: async () => {
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufCode}/municipios`
      );
      if (!res.ok) throw new Error("Failed to fetch municipios");
      return await res.json();
    },
    enabled: !!ufCode,
    staleTime: Infinity,
  });
}
