/**
 * @file HereRoutingService.ts
 * @description Serviço de roteamento usando a HERE Routing API v8.
 * Calcula a melhor rota para um representante visitar seus clientes.
 *
 * Docs: https://developer.here.com/documentation/routing-api/dev_guide/index.html
 */

import axios from 'axios';

const HERE_ROUTER_URL = 'https://router.hereapi.com/v8/routes';
const HERE_OPTIMIZE_URL = 'https://wse.ls.hereapi.com/2/findsequence.json';
const API_KEY = process.env.HERE_API_KEY;

export interface Waypoint {
  lat: number;
  lng: number;
  label?: string; // nome do cliente / referência
}

/**
 * Otimiza a sequência de visitas usando a HERE Waypoints Sequence API.
 * 
 * @param startPoint Ponto de partida (base)
 * @param waypoints Pontos a serem visitados
 * @param endPoint Ponto final (opcional, se não informado volta para a base)
 */
export async function optimizeSequence(
  startPoint: Waypoint,
  waypoints: Waypoint[],
  endPoint?: Waypoint
): Promise<{ orderedIndices: number[]; raw: any }> {
  if (!API_KEY) throw new Error('HERE_API_KEY não configurada');

  const params: any = {
    apiKey: API_KEY,
    start: `${startPoint.lat},${startPoint.lng}`,
    mode: 'fastest;car;traffic:disabled',
  };

  if (endPoint) {
    params.end = `${endPoint.lat},${endPoint.lng}`;
  }

  waypoints.forEach((wp, idx) => {
    params[`destination${idx + 1}`] = `${wp.lat},${wp.lng}`;
  });

  try {
    const response = await axios.get(HERE_OPTIMIZE_URL, { params });
    const results = response.data?.results;

    if (!results || results.length === 0) {
      throw new Error('Nenhuma sequência otimizada encontrada.');
    }

    // A HERE retorna a sequência de 'waypoints' (paradas)
    // Precisamos extrair a ordem baseada nos índices originais
    const waypointsOrder = results[0].waypoints;
    // O primeiro é o start, o último é o end. Os intermediários são os destinos.
    const orderedIndices = waypointsOrder
      .filter((w: any) => w.id.startsWith('destination'))
      .map((w: any) => parseInt(w.id.replace('destination', '')) - 1);

    return {
      orderedIndices,
      raw: response.data
    };
  } catch (error: any) {
    console.error('[HereRoutingService] Erro na Otimização:', error.response?.data || error.message);
    throw error;
  }
}

export interface RouteSection {
  departure: {
    place: { location: { lat: number; lng: number } };
    time: string;
  };
  arrival: {
    place: { location: { lat: number; lng: number } };
    time: string;
  };
  summary: {
    duration: number;   // segundos
    length: number;     // metros
    baseDuration: number;
  };
  polyline?: string;    // encoded polyline (opcional, quando return=polyline)
}

export interface RouteResult {
  totalDuration: number;   // segundos
  totalDistance: number;   // metros
  sections: RouteSection[];
  raw?: object;            // resposta completa da HERE (debug)
}

/**
 * Calcula a rota entre múltiplos pontos (origem → paradas → destino).
 *
 * @param waypoints  Array de pontos em ordem. Mínimo 2 (origem + destino).
 * @param mode       Modo de transporte: 'car' | 'pedestrian' | 'bicycle' | 'truck'
 * @param returnPolyline  Se true, inclui a polyline codificada para desenhar no mapa.
 */
export async function calculateRoute(
  waypoints: Waypoint[],
  mode: 'car' | 'pedestrian' | 'bicycle' | 'truck' = 'car',
  returnPolyline = false
): Promise<RouteResult> {
  if (!API_KEY) {
    throw new Error('HERE_API_KEY não configurada no .env');
  }

  if (waypoints.length < 2) {
    throw new Error('É necessário ao menos 2 pontos (origem e destino).');
  }

  // Monta os parâmetros de waypoints: origin, destination, via (paradas intermediárias)
  const params: Record<string, string> = {
    transportMode: mode,
    apikey: API_KEY,
    return: returnPolyline ? 'summary,polyline' : 'summary',
  };

  // Primeiro ponto = origin, último = destination, intermediários = via
  params['origin'] = `${waypoints[0].lat},${waypoints[0].lng}`;
  params['destination'] = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;

  // Paradas intermediárias (via)
  waypoints.slice(1, -1).forEach((wp, idx) => {
    params[`via[${idx}]`] = `${wp.lat},${wp.lng}`;
  });

  try {
    const response = await axios.get(HERE_ROUTER_URL, { params });
    const routes = response.data?.routes;

    if (!routes || routes.length === 0) {
      throw new Error('Nenhuma rota encontrada pela HERE API.');
    }

    const bestRoute = routes[0];
    const sections: RouteSection[] = bestRoute.sections;

    const totalDuration = sections.reduce((acc: number, s: RouteSection) => acc + s.summary.duration, 0);
    const totalDistance = sections.reduce((acc: number, s: RouteSection) => acc + s.summary.length, 0);

    return {
      totalDuration,
      totalDistance,
      sections,
      raw: response.data,
    };
  } catch (error: any) {
    const hereError = error?.response?.data;
    console.error('[HereRoutingService] Erro na HERE API:', hereError || error.message);
    throw new Error(hereError?.title || 'Falha ao calcular rota com a HERE API.');
  }
}

/**
 * Formata duração em segundos → string legível (ex: "1h 23min")
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

/**
 * Formata distância em metros → string legível (ex: "12,3 km")
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
  }
  return `${meters} m`;
}
