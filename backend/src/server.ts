import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pc from 'picocolors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import interestRoutes from './routes/interest.routes';
import planilhaRoutes from './routes/planilha.routes';
import clientesRoutes from './routes/clientes.routes';
import { prisma } from './prisma';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/interest', interestRoutes);
app.use('/api', planilhaRoutes);
app.use('/api/clientes', clientesRoutes);

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
        console.log(pc.green("✅ Admin master originado com sucesso."));
    }

    app.listen(PORT, () => {
        console.clear();
        console.log(pc.cyan("──────────────────────────────────────────────────"));
        console.log(pc.bold(pc.magenta("🚀 MAPA TERRITÓRIO - BACKEND")));
        console.log(pc.cyan("──────────────────────────────────────────────────"));
        console.log(`${pc.blue("📡 Status:")} ${pc.green("Online")}`);
        console.log(`${pc.blue("🔗 URL Local:")} ${pc.underline(pc.white(`http://localhost:${PORT}`))}`);
        console.log(`${pc.blue("📂 Ambiente:")} ${pc.yellow(process.env.NODE_ENV || 'development')}`);
        console.log(`${pc.blue("🗄️ Database:")} ${pc.green("Prisma ORM")}`);
        console.log(pc.cyan("──────────────────────────────────────────────────"));
        console.log(pc.gray("Aguardando requisições...\n"));
    });
}

bootstrap()
  .catch((e) => {
    console.error(pc.red("❌ Erro fatal na inicialização:"));
    console.error(e);
    process.exit(1);
  });
