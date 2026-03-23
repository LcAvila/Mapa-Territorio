import { Router } from 'express';
import { geocodeAddress } from '../utils/geocoding';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Endpoint para geocodificação manual (útil para o Admin ao cadastrar representantes)
router.get('/', authenticate, async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ message: 'O parâmetro "address" é obrigatório.' });
    }

    const coords = await geocodeAddress(address.toString());

    if (coords) {
      res.json(coords);
    } else {
      res.status(404).json({ message: 'Não foi possível encontrar as coordenadas para o endereço informado.' });
    }
  } catch (error) {
    console.error('Erro na rota de geocodificação:', error);
    res.status(500).json({ message: 'Erro interno ao processar geocodificação.' });
  }
});

export default router;
