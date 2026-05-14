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
  const { authHeaders } = useAuth();
  const API = API_BASE_URL;

  return useQuery({
    queryKey: ["geo", "neighborhoods-backend", municipioCode],
    queryFn: async () => {
      if (!municipioCode) return null;

      try {
        const res = await fetch(`${API}/api/location/neighborhoods-geojson/${municipioCode}`, {
          headers: authHeaders
        });
        if (!res.ok) throw new Error("Erro ao buscar bairros do servidor");
        return await res.json();
      } catch (e) {
        console.error("[GeoHook] Backend neighborhoods failed, using empty collection", e);
        return { type: "FeatureCollection", features: [] };
      }
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
