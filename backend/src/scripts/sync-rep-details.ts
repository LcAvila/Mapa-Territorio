import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const filePath = 'C:\\Users\\Avila\\Desktop\\Mapa-Territorio\\frontend\\public\\Representantes\\Login Rep.xlsx';
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);

  console.log(`Found ${rows.length} rows to sync.`);

  for (const row of rows) {
    const username = String(row['Cod login'] || '').trim();
    const fullName = row['Nome'] ? String(row['Nome']).trim() : null;
    const email = row['E-mail'] ? String(row['E-mail']).trim() : null;
    const contato = row['Contato'] ? String(row['Contato']).trim() : null;
    const cidade = row['Cidade'] ? String(row['Cidade']).trim() : null;
    const estado = row['Estado'] ? String(row['Estado']).trim() : null;
    const cep = row['CEP'] ? String(row['CEP']).trim() : null;
    const endereco = row['Endereço'] || row['Endere\u00e7o'] || row['End'] ? String(row['Endereço'] || row['Endere\u00e7o'] || row['End']).trim() : null;
    const bairro = row['Bairro'] ? String(row['Bairro']).trim() : null;
    const telefone = row['Telefone'] || row['Fone'] ? String(row['Telefone'] || row['Fone']).trim() : null;

    if (!username) continue;

    const repCode = username.replace(/^REP/i, '').replace(/^0+/, '') || '0';

    // Update user record (since Representative was merged into User)
    let user = await prisma.user.findUnique({ where: { username } });
    
    // Fallback to checking by repCode if not found by username
    if (!user && repCode) {
      user = await prisma.user.findUnique({ where: { repCode } });
    }

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          full_name: fullName || user.full_name,
          telefone: telefone || contato || user.telefone,
          cidade: cidade || user.cidade,
          estado_end: estado || user.estado_end,
          cep: cep ? String(cep).padStart(8, '0') : user.cep,
          logradouro: endereco || user.logradouro,
          bairro_end: bairro || user.bairro_end,
        }
      });
      console.log(`Updated user ${user.username} (repCode: ${repCode})`);
    } else {
      console.log(`User not found for username ${username} or repCode ${repCode}`);
    }
  }

  console.log('Done syncing rep details!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
