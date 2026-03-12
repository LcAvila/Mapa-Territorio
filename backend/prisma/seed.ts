/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const excelPath = path.resolve(__dirname, '../../frontend/public/Representantes/Tabela Representantes.xlsx');
  console.log('Lendo arquivo Excel:', excelPath);

  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converte para JSON
  const data: any[] = xlsx.utils.sheet_to_json(worksheet);

  console.log(`Encontrados ${data.length} registros no Excel.`);

  for (const row of data) {
    const code = String(row['cod-rep']);
    const name = row['nome-abrev'] || null;
    const fullName = row['nome'] || null;

    if (!code || code === 'undefined') continue;

    await prisma.representative.upsert({
      where: { code },
      update: {
        name,
        fullName,
      },
      create: {
        code,
        name,
        fullName,
        isVago: 0,
        colorIndex: 0,
      },
    });
  }

  console.log('Seed de representantes concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
