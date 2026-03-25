import { Router } from 'express';
import { LocationService } from '../services/LocationService';

const router = Router();

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

export default router;
