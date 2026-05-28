import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api-base";
import { useAuth } from "@/contexts/auth-context-core";

const API_BASE = `${API_BASE_URL}/api/location`;
const IBGE_MALHAS = "https://servicodados.ibge.gov.br/api/v3/malhas";
const IBGE_LOC = "https://servicodados.ibge.gov.br/api/v1/localidades";

type GeoFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: Record<string, unknown> | null;
  }>;
};

async function fetchAuthedJson<T>(url: string, token: string, tokenVersion: number | null) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-user-token-version": String(tokenVersion ?? 0),
    },
  });

  if (res.status === 401) {
    throw new Error("Sessão expirada ou não autorizada.");
  }

  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao buscar ${url}`);
  }

  return res.json() as Promise<T>;
}

async function fetchPublicJson<T>(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao buscar ${url}`);
  }

  return res.json() as Promise<T>;
}

export function useStatesMetadata() {
  const { token, tokenVersion } = useAuth();

  return useQuery({
    queryKey: ["location", "states", tokenVersion],
    queryFn: async () => {
      if (!token) throw new Error("Token ausente.");
      return fetchAuthedJson(`${API_BASE}/states`, token, tokenVersion);
    },
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    enabled: !!token,
  });
}

export function useCitiesMetadata(ufSigla: string | null) {
  const { token, tokenVersion } = useAuth();

  return useQuery({
    queryKey: ["location", "cities", ufSigla, tokenVersion],
    queryFn: async () => {
      if (!token || !ufSigla) throw new Error("UF ou token ausente.");
      return fetchAuthedJson(`${API_BASE}/cities/${ufSigla}`, token, tokenVersion);
    },
    enabled: !!ufSigla && !!token,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}

export function useDistrictsMetadata(ibgeCode: number | null) {
  const { token, tokenVersion } = useAuth();

  return useQuery({
    queryKey: ["location", "districts", ibgeCode, tokenVersion],
    queryFn: async () => {
      if (!token || !ibgeCode) throw new Error("Código IBGE ou token ausente.");
      return fetchAuthedJson(`${API_BASE}/districts/${ibgeCode}`, token, tokenVersion);
    },
    enabled: !!ibgeCode && !!token,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}

export function useStatesGeoJSON() {
  return useQuery({
    queryKey: ["geo", "states"],
    queryFn: async () => {
      return fetchPublicJson(
        `${IBGE_MALHAS}/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF`
      );
    },
    staleTime: Infinity,
    gcTime: 60 * 60_000,
  });
}

export function useMunicipiosGeoJSON(ufCode: number | null) {
  return useQuery({
    queryKey: ["geo", "municipios", ufCode],
    queryFn: async () => {
      if (!ufCode) throw new Error("UF code ausente.");
      return fetchPublicJson(
        `${IBGE_MALHAS}/estados/${ufCode}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`
      );
    },
    enabled: !!ufCode,
    staleTime: Infinity,
    gcTime: 60 * 60_000,
  });
}

export function useNeighborhoodsGeoJSON(
  municipioCode: number | null,
  municipioName?: string,
  ufSigla?: string
) {
  const { token, tokenVersion } = useAuth();

  return useQuery<GeoFeatureCollection>({
    queryKey: [
      "geo",
      "neighborhoods-backend",
      municipioCode,
      municipioName ?? null,
      ufSigla ?? null,
      tokenVersion,
    ],
    queryFn: async () => {
      if (!municipioCode || !token) {
        throw new Error("Município ou token ausente.");
      }

      const data = await fetchAuthedJson<GeoFeatureCollection>(
        `${API_BASE_URL}/api/location/neighborhoods-geojson/${municipioCode}`,
        token,
        tokenVersion
      );

      console.log("[GeoHook] Neighborhoods raw response:", data);

      if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("Resposta inválida da API de bairros.");
      }

      if (data.features.length === 0) {
        console.warn(`[GeoHook] No neighborhoods found for municipio ${municipioCode}`);
      }

      return data;
    },
    enabled: !!municipioCode && !!token,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useMunicipioNames(ufCode: number | null) {
  return useQuery({
    queryKey: ["ibge", "municipios", ufCode],
    queryFn: async () => {
      if (!ufCode) throw new Error("UF code ausente.");

      const data = await fetchPublicJson<{ id: number | string; nome: string }[]>(
        `${IBGE_LOC}/estados/${ufCode}/municipios`
      );

      const map: Record<string, string> = {};
      data.forEach((m) => {
        map[String(m.id)] = m.nome;
      });

      return map;
    },
    enabled: !!ufCode,
    staleTime: Infinity,
    gcTime: 60 * 60_000,
  });
}

export function useMunicipioInfo(ufCode: number | null) {
  return useQuery({
    queryKey: ["ibge", "municipios-info", ufCode],
    queryFn: async () => {
      if (!ufCode) throw new Error("UF code ausente.");

      return fetchPublicJson<{ id: number; nome: string }[]>(
        `${IBGE_LOC}/estados/${ufCode}/municipios`
      );
    },
    enabled: !!ufCode,
    staleTime: Infinity,
    gcTime: 60 * 60_000,
  });
}