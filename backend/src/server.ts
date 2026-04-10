import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import pc from 'picocolors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import geocodeRoutes from './routes/geocode.routes'; // Added this line
import interestRoutes from './routes/interest.routes';
import planilhaRoutes from './routes/planilha.routes';
import clientesRoutes from './routes/clientes.routes';
import locationRoutes from './routes/location.routes';
import feedRoutes from './routes/feed.routes';
import birthdaysRoutes from './routes/birthdays.routes';
import { prisma } from './prisma';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(helmet());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: { message: 'Muitas requisições deste IP, tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(hpp());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geocode', geocodeRoutes); 
app.use('/api/interest', interestRoutes);
app.use('/api/location', locationRoutes); // Must be BEFORE /api planilhaRoutes (which has global auth middleware)
app.use('/api', planilhaRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/birthdays', birthdaysRoutes);

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
