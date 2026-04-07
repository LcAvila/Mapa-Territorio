import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context-core";

const API_BASE = 'http://localhost:3001';

export interface Representative {
  code: string;
  name: string;
  fullName?: string;
  isVago: boolean | number;
  colorIndex: number;
  comissao?: number;
  _count?: {
    clientes: number;
    territories: number;
  };
}

export interface TerritoryAssignment {
  id: number;
  municipio: string;
  uf: string;
  repCode: string;
  modo: "planejamento" | "atendimento";
}

export interface Cliente {
  id_cliente: number;
  latitude: number;
  longitude: number;
  uf: string;
  nome_cliente: string;
  codigo_cliente: string;
  nome_abreviado?: string;
  endereco_completo?: string;
  bairro?: string;
  repCode?: string;
}

export function useApiRepresentatives(enabled: boolean) {
  const { token, tokenVersion } = useAuth();
  return useQuery<Representative[]>({
    queryKey: ["api", "representatives", !!token],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${API_BASE}/api/admin/reps`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-user-token-version': String(tokenVersion || 0)
        }
      });
      return res.ok ? res.json() : [];
    },
    staleTime: 5_000,
    refetchInterval: token ? 10_000 : false,
    enabled: true  // always enabled; token check inside queryFn
  });
}

export function useApiTerritories(enabled: boolean) {
  const { token, tokenVersion } = useAuth();
  return useQuery<TerritoryAssignment[]>({
    queryKey: ["api", "territories", !!token],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${API_BASE}/api/admin/territories`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-user-token-version': String(tokenVersion || 0)
        }
      });
      return res.ok ? res.json() : [];
    },
    staleTime: 5_000,
    refetchInterval: token ? 10_000 : false,
    enabled: true  // always enabled; token check inside queryFn
  });
}

export function useApiClientes(repCode: string | null) {
  const { token, tokenVersion } = useAuth();
  return useQuery<Cliente[]>({
    queryKey: ["api", "clientes", repCode],
    queryFn: async () => {
      const url = repCode
        ? `${API_BASE}/api/clientes?repCode=${repCode}`
        : `${API_BASE}/api/clientes`;
      const res = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-user-token-version': String(tokenVersion || 0)
        }
      });
      return res.ok ? res.json() : [];
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}

// ── Search & GeoJSON types ──

export interface SearchSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  [key: string]: unknown;
}

export interface GeoJSONFeature {
  type: "Feature";
  properties: {
    codarea?: string | number;
    nome?: string;
    name?: string;
    NM_DIST?: string;
    NM_SUBDIST?: string;
    localidadeId?: number;
    isMunicipality?: boolean;
    [key: string]: unknown;
  };
  geometry: {
    type: "Point" | "MultiPoint" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon" | "GeometryCollection";
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}
