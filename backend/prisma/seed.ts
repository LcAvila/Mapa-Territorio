import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env since seed runs directly
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = 'https://nrwnmeilpcyufaggfgfx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd25tZWlscGN5dWZhZ2dmZ2Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI5MjgxNywiZXhwIjoyMDkwODY4ODE3fQ.agUbUDYbmXdSmYiqruISDjA8lOAtgYB4WxF3ScpB43Q';

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('--- INICIANDO LIMPEZA TOTAL ---');

  // 1. Get all users to clean Supabase Auth
  const allUsers = await prisma.user.findMany({
    where: { NOT: { username: 'admin' } }
  });

  console.log(`Limpando ${allUsers.length} usuários do Supabase Auth...`);
  
  const { data: { users: sbUsers } } = await supabaseAdmin.auth.admin.listUsers();
  
  for (const user of allUsers) {
    const authEmail = `${user.code || user.username}@mapaterritorio.com`;
    const sbUser = sbUsers.find(u => u.email === authEmail);
    if (sbUser) {
        await supabaseAdmin.auth.admin.deleteUser(sbUser.id);
    }
  }

  // 2. Clean Prisma DB (Cascading deletes handle relations)
  console.log('Limpando registros do banco Prisma...');
  await prisma.user.deleteMany({
    where: { NOT: { username: 'admin' } }
  });

  // 3. Ensure Admin exists in Supabase Auth
  console.log('Configurando Administrador no Supabase Auth...');
  const adminEmail = 'admin@mapaterritorio.com';
  const adminPassword = 'avila123';

  const { data: { users: currentSbUsers } } = await supabaseAdmin.auth.admin.listUsers();
  const existingAdmin = currentSbUsers.find(u => u.email === adminEmail);

  if (!existingAdmin) {
    await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Administrador', role: 'admin' }
    });
  } else {
    await supabaseAdmin.auth.admin.updateUserById(existingAdmin.id, {
        password: adminPassword
    });
  }

  // 4. Ensure Admin exists in Prisma
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { 
      password: 'SUPABASE_AUTH_ACTIVE',
      code: 'admin',
      role: 'admin',
      tipo: 'admin'
    },
    create: {
      username: 'admin',
      code: 'admin',
      password: 'SUPABASE_AUTH_ACTIVE',
      full_name: 'Administrador',
      role: 'admin',
      tipo: 'admin'
    }
  });

  console.log('Administrador sincronizado!');

  // 5. System Modules
  const modules = [
    { id: 'dashboard', name: 'Dashboard Principal' },
    { id: 'mapa', name: 'Mapa Interativo' },
    { id: 'users', name: 'Gerenciamento Usuários' },
    { id: 'clientes', name: 'Cadastro Clientes' },
    { id: 'territories', name: 'Gestão Territórios' },
    { id: 'reps', name: 'Equipe Representantes' },
    { id: 'logistica', name: 'Planejamento Logístico' },
    { id: 'notifications', name: 'Central de Alertas' },
    { id: 'audit', name: 'Logs de Auditoria' },
    { id: 'routes', name: 'Gestão de Rotas' }
  ];

  for (const mod of modules) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: { name: mod.name },
      create: mod
    });
  }

  // 6. Admin Permissions
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (adminUser) {
    for (const mod of modules) {
      await prisma.userPermission.upsert({
        where: {
          userId_moduleId: { userId: adminUser.id, moduleId: mod.id }
        },
        update: { canView: true, canEdit: true },
        create: { userId: adminUser.id, moduleId: mod.id, canView: true, canEdit: true }
      });
    }
  }

  // 7. Groups
  await prisma.group.upsert({
    where: { name: 'Geral' },
    update: {},
    create: { name: 'Geral' }
  });

  console.log('--- LIMPEZA E CONFIGURAÇÃO CONCLUÍDAS ---');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
