/**
 * Diagnóstico completo do fluxo de login.
 * Simula exatamente o que o frontend faz ao fazer login.
 */
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== DIAGNÓSTICO DE LOGIN ===\n');

  console.log('[1] Variáveis de ambiente:');
  console.log('  SUPABASE_URL:', supabaseUrl ? '✅ OK' : '❌ FALTANDO');
  console.log('  SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ OK' : '❌ FALTANDO');
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ OK' : '❌ FALTANDO');

  // Step 2: Testa login via Supabase (como o frontend faz)
  console.log('\n[2] Testando login no Supabase como admin...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@mapaterritorio.com',
    password: 'admin123',
  });

  if (authError) {
    console.error('  ❌ Supabase login FALHOU:', authError.message);
    console.log('\n  → Senha incorreta ou usuário não existe no Supabase Auth');
    return;
  }
  console.log('  ✅ Supabase login OK. Token obtido.');
  const token = authData.session?.access_token;

  // Step 3: Valida o token como o backend faz (usando anon key)
  console.log('\n[3] Validando token com supabase.auth.getUser() [como o backend faz]...');
  const { data: { user: sbUser }, error: sbError } = await supabase.auth.getUser(token);
  if (sbError || !sbUser) {
    console.error('  ❌ getUser() FALHOU:', sbError?.message);
    console.log('\n  → O backend retornaria 401: "Sessão inválida ou expirada"');
    return;
  }
  console.log('  ✅ getUser() OK. Email do Supabase:', sbUser.email);

  // Step 4: Extrai o código e busca no Prisma
  const accessCode = sbUser.email?.split('@')[0];
  console.log('\n[4] Buscando usuário no Prisma com code/username:', accessCode);
  const user = await prisma.user.findFirst({
    where: { OR: [{ code: accessCode }, { username: accessCode }] },
    select: { id: true, username: true, code: true, role: true }
  });

  if (!user) {
    console.error(`  ❌ Prisma: NENHUM usuário encontrado com code/username = "${accessCode}"`);
    console.log('\n  → O backend retornaria 401: "Perfil não encontrado"');
    return;
  }
  console.log('  ✅ Prisma OK. Usuário encontrado:', JSON.stringify(user));

  console.log('\n✅ TUDO OK! O login deveria funcionar.');
  console.log('   Se ainda está dando 401, o backend precisa ser reiniciado (variáveis de .env não carregadas)\n');
}

main()
  .catch(e => console.error('\n❌ ERRO INESPERADO:', e.message))
  .finally(() => prisma.$disconnect());
