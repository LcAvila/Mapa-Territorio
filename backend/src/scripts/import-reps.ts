import * as XLSX from 'xlsx';
import { prisma } from '../prisma';
import { supabaseAdmin } from '../lib/supabase';
import * as dotenv from 'dotenv';

dotenv.config();

const excelPath = 'C:\\Users\\Avila\\Documents\\Mapa-Territorio\\frontend\\public\\Cad Representantes\\Login Rep.xlsx';

async function importReps() {
  console.log('--- INICIANDO IMPORTAÇÃO DE REPRESENTANTES ---');
  
  try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Encontrados ${data.length} registros na planilha.`);

    for (const row of data) {
      const code = String(row['Cod login'] || '').trim();
      const password = String(row['Pass login'] || '').trim();
      const name = String(row['Nome'] || '').trim();
      const email = String(row['E-mail'] || '').trim();
      const address = String(row['Endereco'] || '').trim();
      const bairro = String(row['Bairro'] || '').trim();
      const cidade = String(row['Cidade'] || '').trim();
      const estado = String(row['Estado'] || '').trim();
      const cep = String(row['CEP'] || '').trim();

      if (!code || code === 'undefined') continue;

      console.log(`Processando ${code} - ${name}...`);

      try {
        // 1. Verificar se usuário já existe no Prisma
        const existing = await prisma.user.findFirst({
          where: { OR: [{ code }, { username: code }] }
        });

        if (existing) {
          console.log(`[SKIP] Usuário ${code} já existe.`);
          continue;
        }

        // 2. Criar no Supabase Auth
        // Email fake baseado no código para garantir unicidade no Supabase se o email real falhar/não existir
        const authEmail = (email && email !== 'undefined' && email.includes('@')) ? email : `${code}@mapaterritorio.com`;
        
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password: password || `${code}@123`,
          email_confirm: true,
          user_metadata: { full_name: name, role: 'user' }
        });

        if (authError) {
          if (authError.message.includes('already been registered')) {
            console.warn(`[WARN] Email ${authEmail} já registrado no Supabase Auth.`);
          } else {
            console.error(`[ERROR] Erro Supabase Auth para ${code}:`, authError.message);
            continue;
          }
        }

        // 3. Criar no Banco de Dados via Prisma
        const userData: any = {
            username: code,
            password: 'SUPABASE_AUTH_ACTIVE',
            role: 'user',
            tipo: 'representante',
            full_name: name,
            code: code,
            repCode: code,
            email: email && email !== 'undefined' ? email : null,
            logradouro: address,
            bairro_end: bairro,
            cidade: cidade,
            estado_end: estado,
            cep: cep,
            last_active: new Date(0),
        };

        await prisma.user.create({ data: userData });

        console.log(`[SUCCESS] ${code} cadastrado com sucesso.`);

      } catch (err: any) {
        console.error(`[FATAL] Erro ao processar ${code}:`, err?.message || err);
      }
    }

    console.log('\n--- IMPORTAÇÃO CONCLUÍDA ---');

  } catch (error: any) {
    console.error('Erro ao ler a planilha:', error?.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

importReps();
