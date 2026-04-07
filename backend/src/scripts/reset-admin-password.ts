/**
 * Reseta a senha do admin no Supabase Auth
 * Uso: npx ts-node src/scripts/reset-admin-password.ts
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

const ADMIN_CODE     = 'admin';
const ADMIN_EMAIL    = `${ADMIN_CODE}@mapaterritorio.com`;
const NEW_PASSWORD   = 'admin123';

async function main() {
  console.log(`🔑 Resetando senha do admin no Supabase...`);

  // Busca o usuário pelo email no Supabase
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw new Error(`Erro ao listar usuários: ${listError.message}`);

  const existing = users.find(u => u.email === ADMIN_EMAIL);

  if (!existing) {
    // Cria do zero
    console.log('⚠️  Usuário não encontrado, criando...');
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: NEW_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Administrador' },
    });
    if (error) throw new Error(`Erro ao criar: ${error.message}`);
    console.log('✅  Usuário criado!');
  } else {
    // Atualiza a senha
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: NEW_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Erro ao atualizar senha: ${error.message}`);
    console.log(`✅  Senha atualizada! (id: ${existing.id})`);
  }

  // Garante registro no Prisma também
  await prisma.user.upsert({
    where: { username: ADMIN_CODE },
    update:  { password: 'SUPABASE_AUTH_ACTIVE', role: 'admin', tipo: 'admin', full_name: 'Administrador' },
    create:  { username: ADMIN_CODE, code: ADMIN_CODE, password: 'SUPABASE_AUTH_ACTIVE', role: 'admin', tipo: 'admin', full_name: 'Administrador' },
  });

  console.log('✅  Prisma DB sincronizado!');
  console.log('');
  console.log('✨  Faça login com:');
  console.log(`    Usuário : ${ADMIN_CODE}`);
  console.log(`    Senha   : ${NEW_PASSWORD}`);
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
