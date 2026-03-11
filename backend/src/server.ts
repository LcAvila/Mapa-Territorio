import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import interestRoutes from './routes/interest.routes';
import planilhaRoutes from './routes/planilha.routes';
import { prisma } from './prisma';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', interestRoutes);
app.use('/api', planilhaRoutes);

async function bootstrap() {
    // Garantir que existe o usuário 'admin' do Prisma igual tinha no SQLite.
    const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!adminExists) {
        const bcrypt = require('bcryptjs');
        const adminPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                username: 'admin',
                password: adminPassword,
                role: 'admin',
                tipo: 'admin',
                full_name: 'Administrador'
            }
        });
        console.log("🟢 Admin master originado com sucesso.");
    }

    app.listen(PORT, () => {
        console.log(`🚀 Servidor Enterprise ORM rodando na porta ${PORT}`);
    });
}

bootstrap()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
