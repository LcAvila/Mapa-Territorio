// backend/src/routes/location.routes.ts

import { Router, Request, Response } from 'express';
import { LocationService } from '../services/LocationService';
import { prisma } from '../prisma';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Protege todos os endpoints de localização
router.use(authenticate);

/**
 * GET /location/states
 * Lista estados (UFs) via API do IBGE.
 */
router.get('/states', async (req: Request, res: Response) => {
  try {
    const states = await LocationService.getStates();
    res.json(states);
  } catch (error) {
    console.error('[Location] Error fetching states:', error);
    res.status(500).json({ error: 'Erro ao buscar estados' });
  }
});

/**
 * GET /location/cities/:uf
 * Lista municípios de uma UF (sigla) via API do IBGE.
 */
router.get('/cities/:uf', async (req: Request, res: Response) => {
  try {
    // Garante que o valor é string simples (evita string | string[])
    const uf = String(req.params.uf);

    const cities = await LocationService.getCities(uf);
    res.json(cities);
  } catch (error) {
    console.error('[Location] Error fetching cities:', error);
    res
      .status(500)
      .json({ error: `Erro ao buscar cidades de ${req.params.uf}` });
  }
});

/**
 * GET /location/districts/:ibgeCode
 * Lista distritos de um município via código IBGE do MUNICÍPIO.
 */
router.get('/districts/:ibgeCode', async (req: Request, res: Response) => {
  try {
    const ibgeCodeParam = String(req.params.ibgeCode);
    const codeNum = Number(ibgeCodeParam);

    if (!codeNum) {
      return res.status(400).json({ error: 'Código IBGE inválido' });
    }

    const districts = await LocationService.getDistricts(codeNum);
    res.json(districts);
  } catch (error) {
    console.error('[Location] Error fetching districts:', error);
    res.status(500).json({
      error: `Erro ao buscar bairros/distritos do IBGE ${req.params.ibgeCode}`
    });
  }
});

/**
 * GET /location/neighborhoods-geojson/:ibgeCode
 * GeoJSON de bairros / subdivisões administrativas de um município (Overpass).
 */
router.get(
  '/neighborhoods-geojson/:ibgeCode',
  async (req: Request, res: Response) => {
    try {
      const ibgeCodeParam = String(req.params.ibgeCode);
      const codeNum = Number(ibgeCodeParam);

      if (!codeNum) {
        return res.status(400).json({ error: 'Código IBGE inválido' });
      }

      const geojson = await LocationService.getNeighborhoodsGeoJSON(codeNum);
      res.json(geojson);
    } catch (error) {
      console.error(
        '[Location] Error fetching neighborhoods GeoJSON (Overpass):',
        error
      );
      res
        .status(500)
        .json({ error: 'Erro ao buscar polígonos dos bairros (Overpass)' });
    }
  }
);

/**
 * GET /location/bairros/:cidade/:uf
 * Bairros locais armazenados na tabela "bairro" (seu banco).
 */
router.get(
  '/bairros/:cidade/:uf',
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Normaliza params para string (evita string | string[])
      const cidade = String(req.params.cidade);
      const uf = String(req.params.uf);

      const bairros = await prisma.bairro.findMany({
        where: {
          municipio: { equals: cidade, mode: 'insensitive' },
          uf: { equals: uf, mode: 'insensitive' }
        },
        orderBy: { bairro: 'asc' }
      });

      res.json(bairros);
    } catch (error) {
      console.error('[Location] Error fetching local bairros:', error);
      res.status(500).json({ error: 'Erro ao buscar bairros locais' });
    }
  }
);

export default router;