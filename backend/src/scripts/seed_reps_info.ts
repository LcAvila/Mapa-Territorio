import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';

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
      await prisma.representative.upsert({
        where: { code },
        update: {
          fullName,
          endereco: row[1] || null,
          bairro: row[2] || null,
          cidade: row[3] || null,
          uf: row[4] || null,
          cep: String(row[5] || ''),
          email: row[6] || null,
          contato: row[7] || null,
          comissao: row[9] ? parseFloat(row[9]) : null
        },
        create: {
          code,
          name,
          fullName,
          endereco: row[1] || null,
          bairro: row[2] || null,
          cidade: row[3] || null,
          uf: row[4] || null,
          cep: String(row[5] || ''),
          email: row[6] || null,
          contato: row[7] || null,
          comissao: row[9] ? parseFloat(row[9]) : null,
          isVago: 0,
          colorIndex: Math.floor(Math.random() * 20)
        }
      });
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
