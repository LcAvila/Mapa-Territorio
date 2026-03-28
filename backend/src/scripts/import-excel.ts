import { PrismaClient } from '@prisma/client';
import "dotenv/config";
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.resolve(__dirname, '../../../frontend/public/Planilha Base/Planejamento_Rotas.xlsx');
  console.log(`Lendo arquivo: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error('Arquivo não encontrado!');
    process.exit(1);
  }

  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  
  // Lê as linhas como array para evitar problema de cabeçalhos errados (ex: a coluna Vendedor se chamar 'Andressa')
  const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total de registros lidos: ${data.length}`);
  
  if (data.length <= 1) return;

  const reps = await prisma.user.findMany({
    where: { tipo: 'representante' }
  });
  console.log(`Temos ${reps.length} representantes no banco.`);

  let updatedCount = 0;
  let repMismatch = 0;

  // Ignorar a primeira linha (cabeçalhos na maior parte das colunas)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row.length) continue;

    // Acessando diretamente pelos índices com base na ordem que vimos
    const codigo = String(row[0] || '').trim();
    const nome = String(row[1] || '').trim();
    const repName = String(row[6] || '').trim(); // Index 6 is 'Repres'
    const supervisorName = String(row[3] || '').trim(); // Index 3 is 'Supervisor'

    if (!codigo && !nome) continue;

    let repCode = null;
    if (repName) {
      const foundRep = reps.find(r => {
        const nameMatch = r.username ? repName.toLowerCase().includes(r.username.toLowerCase()) : false;
        const fullNameMatch = r.full_name ? repName.toLowerCase().includes(r.full_name.toLowerCase()) : false;
        return nameMatch || fullNameMatch;
      });
      if (foundRep) {
        repCode = foundRep.repCode;
      } else {
        repMismatch++;
      }
    }

    try {
      const existing = codigo ? await prisma.cliente.findFirst({ where: { codigo_cliente: codigo } }) : null;
      
      if (existing) {
        // Atualiza apenas os vínculos se encontrou o cliente (já existem)
        await prisma.cliente.update({
          where: { id_cliente: existing.id_cliente },
          data: {
             repCode: repCode || existing.repCode,
             supervisorName: supervisorName || existing.supervisorName,
          }
        });
        updatedCount++;
      }
    } catch (e) {
      console.error(`Erro ao atualizar cliente ${nome}:`, e);
    }
  }

  console.log('--- RESUMO DE ATUALIZAÇÃO ---');
  console.log(`Clientes Atualizados na Base: ${updatedCount}`);
  console.log(`Não foi possível achar o representante exato no banco para (RepMismatch): ${repMismatch} clientes`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
