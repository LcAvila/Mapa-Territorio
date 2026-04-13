/**
 * @file use-routing.ts
 * @description Hook para calcular rotas via HERE Routing API (via backend).
 */

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context-core";
import { Cliente } from "./use-api-data";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface RouteWaypoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface RouteSection {
  index: number;
  departure: { place: { location: { lat: number; lng: number } }; time: string };
  arrival: { place: { location: { lat: number; lng: number } }; time: string };
  duration: number;
  durationFormatted: string;
  distance: number;
  distanceFormatted: string;
  polyline?: string;
}

export interface RouteResult {
  totalDuration: number;
  totalDistance: number;
  durationFormatted: string;
  distanceFormatted: string;
  waypointCount: number;
  sections: RouteSection[];
}

export type TransportMode = "car" | "truck" | "pedestrian" | "bicycle";

export function useRouting() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);

  const calculateRoute = useCallback(
    async (
      waypoints: RouteWaypoint[],
      mode: TransportMode = "car"
    ): Promise<RouteResult | null> => {
      if (!token) { setError("Não autenticado."); return null; }
      if (waypoints.length < 2) { setError("São necessários pelo menos 2 pontos."); return null; }

      setIsLoading(true);
      setError(null);

      try {
        const resp = await fetch(`${API_BASE}/api/routing/route`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ waypoints, mode, polyline: false }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `Erro ${resp.status}`);
        }

        const data: RouteResult = await resp.json();
        setResult(data);
        return data;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Falha ao calcular rota.");
        setResult(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const clearRoute = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  /**
   * Converte uma lista de clientes em waypoints para a rota.
   * Requer que os clientes tenham latitude/longitude.
   */
  const clientesToWaypoints = useCallback(
    (origin: RouteWaypoint, clientes: Cliente[]): RouteWaypoint[] => {
      const stops: RouteWaypoint[] = clientes
        .filter((c) => c.latitude && c.longitude)
        .map((c) => ({
          lat: c.latitude,
          lng: c.longitude,
          label: c.nome_cliente,
        }));
      return [origin, ...stops];
    },
    []
  );

  return { calculateRoute, clearRoute, clientesToWaypoints, isLoading, error, result };
}
