import path from 'path';
import dotenv from 'dotenv';
// Força o carregamento do .env do diretório atual
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import pc from 'picocolors';

// console.log(pc.yellow(`[CONFIG] Carregando .env de: ${path.resolve(process.cwd(), '.env')}`));
// console.log(pc.yellow(`[CONFIG] SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ ok' : '❌ VAZIO'}`));
// console.log(pc.yellow(`[CONFIG] SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ ok' : '❌ VAZIO'}`));

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import geocodeRoutes from './routes/geocode.routes'; // Added this line
import interestRoutes from './routes/interest.routes';
import planilhaRoutes from './routes/planilha.routes';
import clientesRoutes from './routes/clientes.routes';
import locationRoutes from './routes/location.routes';
import feedRoutes from './routes/feed.routes';
import birthdaysRoutes from './routes/birthdays.routes';
import routingRoutes from './routes/routing.routes';
import notificationsRoutes from './routes/notifications.routes';
import { prisma } from './prisma';

const app = express();

// LOGGER GLOBAL DE SEGURANÇA - Captura tudo o que bater na porta 3001
app.use((req, res, next) => {
  console.log(`[NETWORK] Recebido: ${req.method} ${req.url} de ${req.headers.origin || 'origem desconhecida'}`);
  next();
});

const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173'
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como mobile ou curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Bloqueado: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/api/routing', routingRoutes);
app.use('/api/notifications', notificationsRoutes);

async function bootstrap() {
    // Inicia o servidor PRIMEIRO, independente do banco
    app.listen(PORT, () => {
        console.log(pc.cyan("──────────────────────────────────────────────────"));
        console.log(pc.bold(pc.magenta("🚀 MAPA TERRITÓRIO - BACKEND")));
        console.log(pc.cyan("──────────────────────────────────────────────────"));
        console.log(`${pc.blue("📡 Status:")} ${pc.green("Online")}`);
        console.log(`${pc.blue("🔗 URL Local:")} ${pc.underline(pc.white(`http://localhost:${PORT}`))}`);
        console.log(`${pc.blue("📂 Ambiente:")} ${pc.yellow(process.env.NODE_ENV || 'development')}`);
        console.log(`${pc.blue("🗄️ Database:")} ${pc.green("Prisma ORM")}`);
        console.log(`${pc.blue("☁️ Supabase URL:")} ${process.env.SUPABASE_URL ? pc.green("Conectado") : pc.red("FALTANDO")}`);
        console.log(`${pc.blue("☁️ Supabase Key:")} ${process.env.SUPABASE_ANON_KEY ? pc.green("Presente") : pc.red("FALTANDO")}`);
        console.log(pc.cyan("──────────────────────────────────────────────────"));
        console.log(pc.gray("Aguardando requisições...\n"));
    });

    // Seed do admin em background — não bloqueia o servidor
    try {
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
            console.log(pc.green("✅ Admin master criado com sucesso."));
        } else {
            console.log(pc.green("✅ Banco de dados conectado com sucesso."));
        }
    } catch (e) {
        console.warn(pc.yellow("⚠️  Não foi possível conectar ao banco de dados na inicialização."));
        console.warn(pc.yellow("   O servidor está online, mas as rotas que dependem do banco podem falhar."));
        console.warn(pc.gray("   Verifique a conexão com o Supabase e reinicie o servidor."));
    }
}

bootstrap()
  .catch((e) => {
    console.error(pc.red("❌ Erro fatal na inicialização:"));
    console.error(e);
    process.exit(1);
  });
