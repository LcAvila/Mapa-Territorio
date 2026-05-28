import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context-core";
import { API_BASE_URL } from "@/lib/api-base";
import type { TerritoryAssignment } from "@/data/territories";
import type { SystemUser } from "@/data/representatives";

export type { TerritoryAssignment, SystemUser };

const API_BASE = API_BASE_URL;

export interface Cliente {
  id_cliente: number;
  latitude: number;
  longitude: number;
  uf: string;
  cidade?: string;
  nome_cliente: string;
  codigo_cliente: string;
  nome_abreviado?: string;
  endereco_completo?: string;
  bairro?: string;
  userId?: number;
}

async function fetchJson<T>(url: string, token: string, tokenVersion: number | null) {
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

export function useApiUsers(enabled: boolean) {
  const { token, tokenVersion, role } = useAuth();
  const isAdminLike = role === "admin" || role === "supervisor";

  return useQuery<SystemUser[]>({
    queryKey: ["api", "users", isAdminLike, tokenVersion],
    queryFn: async () => {
      if (!token) throw new Error("Token ausente.");

      const endpoint = isAdminLike
        ? `${API_BASE}/api/admin/users`
        : `${API_BASE}/api/auth/users/map`;

      return fetchJson<SystemUser[]>(endpoint, token, tokenVersion);
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: token ? 60_000 : false,
    refetchOnWindowFocus: false,
    enabled: enabled && !!token,
  });
}

export function useApiRepresentatives(enabled: boolean) {
  const usersQuery = useApiUsers(enabled);

  return {
    ...usersQuery,
    data: (usersQuery.data ?? []).filter(
      (u) => u.role === "user" || u.role === "supervisor"
    ),
  };
}

export function useApiTerritories(enabled: boolean) {
  const { token, tokenVersion } = useAuth();

  return useQuery<TerritoryAssignment[]>({
    queryKey: ["api", "territories", tokenVersion],
    queryFn: async () => {
      if (!token) throw new Error("Token ausente.");

      return fetchJson<TerritoryAssignment[]>(
        `${API_BASE}/api/admin/territories`,
        token,
        tokenVersion
      );
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: token ? 60_000 : false,
    refetchOnWindowFocus: false,
    enabled: enabled && !!token,
  });
}

export function useApiClientes(userId: number | string | null) {
  const { token, tokenVersion } = useAuth();

  return useQuery<Cliente[]>({
    queryKey: ["api", "clientes", userId, tokenVersion],
    queryFn: async () => {
      if (!token) throw new Error("Token ausente.");

      const url = userId
        ? `${API_BASE}/api/clientes?userId=${userId}`
        : `${API_BASE}/api/clientes`;

      return fetchJson<Cliente[]>(url, token, tokenVersion);
    },
    enabled: !!token,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

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
    type:
      | "Point"
      | "MultiPoint"
      | "LineString"
      | "MultiLineString"
      | "Polygon"
      | "MultiPolygon"
      | "GeometryCollection";
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}