import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// GET /api/birthdays/month - Aniversariantes do mes
router.get('/month', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;

    const users = await prisma.user.findMany({
      where: {
        birth_date: { not: null }
      },
      select: {
        id: true,
        full_name: true,
        username: true,
        photo: true,
        birth_date: true,
        tipo: true,
        role: true
      }
    });

    const birthdayUsers = users.filter(u => {
      const bDate = new Date(u.birth_date as any);
      return bDate.getUTCMonth() + 1 === currentMonth;
    }).sort((a, b) => {
      // sort by day of month
      const aDay = new Date(a.birth_date as any).getUTCDate();
      const bDay = new Date(b.birth_date as any).getUTCDate();
      return aDay - bDay;
    });

    res.json(birthdayUsers);
  } catch (error) {
    console.error('Erro ao buscar aniversariantes:', error);
    res.status(500).json({ message: 'Erro ao buscar aniversariantes do mês.' });
  }
});

export default router;
