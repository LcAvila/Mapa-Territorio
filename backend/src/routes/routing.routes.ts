/**
 * @file routing.routes.ts
 * @description Rotas de roteamento para representantes — usa a HERE Routing API.
 *
 * POST /api/routing/route
 *   Body: { waypoints: [{ lat, lng, label? }], mode?: 'car'|'truck'|..., polyline?: boolean }
 *   Retorna: { totalDuration, totalDistance, durationFormatted, distanceFormatted, sections }
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  calculateRoute,
  formatDuration,
  formatDistance,
  Waypoint,
} from '../services/HereRoutingService';

const router = Router();

// Todos os endpoints de routing exigem autenticação
router.use(authenticate);

/**
 * POST /api/routing/route
 *
 * Calcula a rota entre múltiplos pontos para o representante.
 *
 * Body:
 * {
 *   waypoints: [
 *     { lat: -22.9, lng: -43.1, label: "Início" },
 *     { lat: -22.8, lng: -43.2, label: "Cliente A" },
 *     { lat: -22.7, lng: -43.3, label: "Destino Final" }
 *   ],
 *   mode: "car",        // opcional, padrão: "car"
 *   polyline: false     // opcional, padrão: false
 * }
 */
router.post('/route', async (req: Request, res: Response) => {
  try {
    const { waypoints, mode = 'car', polyline = false } = req.body;

    // Validações básicas
    if (!waypoints || !Array.isArray(waypoints)) {
      return res.status(400).json({
        error: 'O campo "waypoints" é obrigatório e deve ser um array.'
      });
    }

    if (waypoints.length < 2) {
      return res.status(400).json({
        error: 'São necessários ao menos 2 waypoints (origem e destino).'
      });
    }

    const validModes = ['car', 'pedestrian', 'bicycle', 'truck'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({
        error: `Modo inválido. Use: ${validModes.join(', ')}`
      });
    }

    // Valida estrutura de cada waypoint
    for (let i = 0; i < waypoints.length; i++) {
      const wp: Waypoint = waypoints[i];
      if (typeof wp.lat !== 'number' || typeof wp.lng !== 'number') {
        return res.status(400).json({
          error: `Waypoint [${i}] inválido. Cada ponto deve ter "lat" e "lng" numéricos.`
        });
      }
    }

    const result = await calculateRoute(waypoints, mode, polyline);

    return res.json({
      totalDuration: result.totalDuration,
      totalDistance: result.totalDistance,
      durationFormatted: formatDuration(result.totalDuration),
      distanceFormatted: formatDistance(result.totalDistance),
      waypointCount: waypoints.length,
      sections: result.sections.map((s, idx) => ({
        index: idx,
        departure: s.departure,
        arrival: s.arrival,
        duration: s.summary.duration,
        durationFormatted: formatDuration(s.summary.duration),
        distance: s.summary.length,
        distanceFormatted: formatDistance(s.summary.length),
        ...(s.polyline ? { polyline: s.polyline } : {}),
      })),
    });
  } catch (error: any) {
    console.error('[routing.routes] Erro:', error.message);
    return res.status(500).json({ error: error.message || 'Erro interno ao calcular rota.' });
  }
});

export default router;
