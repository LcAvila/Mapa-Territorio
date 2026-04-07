/**
 * Script para criar o usuário admin no Supabase Auth + Prisma DB
 * Uso: npx ts-node src/scripts/create-admin.ts
 */
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const prisma = new PrismaClient();

// ─── Configuração do admin ──────────────────────────────────────────────────
const ADMIN_CODE     = 'admin';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME     = 'Administrador';
const ADMIN_EMAIL    = `${ADMIN_CODE}@mapaterritorio.com`; // formato padrão do sistema

async function main() {
  console.log('🚀 Criando usuário admin...');
  console.log(`   Email Supabase : ${ADMIN_EMAIL}`);
  console.log(`   Senha          : ${ADMIN_PASSWORD}`);
  console.log(`   Código/login   : ${ADMIN_CODE}`);
  console.log('');

  // 1. Criar no Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_NAME },
  });

  if (authError) {
    if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
      console.log('⚠️  Usuário já existe no Supabase Auth — continuando...');
    } else {
      throw new Error(`Supabase Auth Error: ${authError.message}`);
    }
  } else {
    console.log(`✅  Supabase Auth: usuário criado (id: ${authData.user?.id})`);
  }

  // 2. Criar/atualizar no Prisma DB
  const user = await prisma.user.upsert({
    where: { username: ADMIN_CODE },
    update: {
      password: 'SUPABASE_AUTH_ACTIVE',
      role: 'admin',
      tipo: 'admin',
      full_name: ADMIN_NAME,
    },
    create: {
      username: ADMIN_CODE,
      code: ADMIN_CODE,
      password: 'SUPABASE_AUTH_ACTIVE',
      role: 'admin',
      tipo: 'admin',
      full_name: ADMIN_NAME,
    },
  });

  console.log(`✅  Prisma DB     : usuário criado/atualizado (id: ${user.id})`);
  console.log('');
  console.log('✨  Pronto! Faça login com:');
  console.log(`    Usuário : ${ADMIN_CODE}`);
  console.log(`    Senha   : ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => { console.error('❌ Erro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
