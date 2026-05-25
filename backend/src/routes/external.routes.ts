import { Router } from 'express';
import { ViaCEPService } from '../services/ViaCEPService';
import { IBGEService } from '../services/IBGEService';

const router = Router();

router.get('/cep/:cep', async (req, res) => {
  try {
    const data = await ViaCEPService.getAddressByCep(req.params.cep);
    if (!data) return res.status(404).json({ message: 'CEP não encontrado' });
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/estados', async (req, res) => {
  try {
    const data = await IBGEService.getEstados();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/municipios/:uf', async (req, res) => {
  try {
    const data = await IBGEService.getMunicipiosByEstado(req.params.uf);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
