import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.resolve(__dirname, '../../../frontend/public/Representantes/Enderecos_Repres1.xlsm');
  console.log(`Lendo arquivo: ${filePath}`);
  
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Use header: 1 to avoid issues with different column names in JSON
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Skip header row
  const dataRows = rows.slice(1);

  console.log(`Importando informações de ${dataRows.length} representantes...`);

  let count = 0;
  for (const row of dataRows as any[]) {
    const code = String(row[8] || '').trim();
    if (!code) continue;

    const fullName = row[0] || '';
    const name = fullName.split(' ')[0]; // fallback short name
    
    try {
      const defaultPassword = await bcrypt.hash('123456', 10);
      const existing = await prisma.user.findUnique({ where: { repCode: code } });
      
      if (existing) {
        await prisma.user.update({
          where: { repCode: code },
          data: {
            full_name: fullName,
            logradouro: row[1] || null,
            bairro_end: row[2] || null,
            cidade: row[3] || null,
            estado_end: row[4] || null,
            cep: String(row[5] || ''),
            telefone: row[7] || null,
            comissao: row[9] ? parseFloat(row[9]) : null
          }
        });
      } else {
        await prisma.user.create({
          data: {
            repCode: code,
            username: `rep_${code}`,
            password: defaultPassword,
            full_name: fullName,
            logradouro: row[1] || null,
            bairro_end: row[2] || null,
            cidade: row[3] || null,
            estado_end: row[4] || null,
            cep: String(row[5] || ''),
            telefone: row[7] || null,
            comissao: row[9] ? parseFloat(row[9]) : null,
            isVago: 0,
            colorIndex: Math.floor(Math.random() * 20),
            role: 'representante',
            tipo: 'representante'
          }
        });
      }
      count++;
    } catch (e) {
      console.error(`Erro ao importar representante ${code}:`, e);
    }
  }

  console.log(`Sucesso: ${count} representantes atualizados.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
