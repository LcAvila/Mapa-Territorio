import { Router } from 'express';
import { LocationService } from '../services/LocationService';
import { prisma } from '../prisma';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Protect all location endpoints
router.use(authenticate);

router.get('/states', async (req, res) => {
  try {
    const states = await LocationService.getStates();
    res.json(states);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estados' });
  }
});

router.get('/cities/:uf', async (req, res) => {
  try {
    const { uf } = req.params;
    const cities = await LocationService.getCities(uf);
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: `Erro ao buscar cidades de ${req.params.uf}` });
  }
});

router.get('/districts/:ibgeCode', async (req, res) => {
  try {
    const { ibgeCode } = req.params;
    const districts = await LocationService.getDistricts(Number(ibgeCode));
    res.json(districts);
  } catch (error) {
    res.status(500).json({ error: `Erro ao buscar bairros do IBGE ${req.params.ibgeCode}` });
  }
});

router.get('/neighborhoods-geojson/:ibgeCode', async (req, res) => {
  try {
    const { ibgeCode } = req.params;
    const geojson = await LocationService.getNeighborhoodsGeoJSON(Number(ibgeCode));
    res.json(geojson);
  } catch (error) {
    console.error('[Location] Error fetching neighborhoods GeoJSON:', error);
    res.status(500).json({ error: 'Erro ao buscar polígonos dos bairros' });
  }
});

router.get('/bairros/:cidade/:uf', async (req, res) => {
  try {
    const { cidade, uf } = req.params;
    const bairros = await prisma.bairro.findMany({
      where: {
        municipio: { equals: cidade, mode: 'insensitive' },
        uf: { equals: uf, mode: 'insensitive' }
      },
      orderBy: { bairro: 'asc' }
    });
    res.json(bairros);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar bairros locais' });
  }
});

export default router;
