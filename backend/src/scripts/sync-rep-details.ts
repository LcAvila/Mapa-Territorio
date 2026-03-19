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

    // Update user record
    const user = await prisma.user.findUnique({ where: { username } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          full_name: fullName || user.full_name,
          telefone: telefone || user.telefone,
          cidade: cidade || user.cidade,
          estado_end: estado || user.estado_end,
          cep: cep ? String(cep).padStart(8, '0') : user.cep,
          logradouro: endereco || user.logradouro,
          bairro_end: bairro || user.bairro_end,
        }
      });
      console.log(`Updated user ${username}`);
    }

    // Update representative record
    const rep = await prisma.representative.findUnique({ where: { code: repCode } });
    if (rep) {
      await prisma.representative.update({
        where: { code: repCode },
        data: {
          fullName: fullName || rep.fullName,
          email: email || rep.email,
          contato: contato || rep.contato,
          cidade: cidade || rep.cidade,
          uf: estado || rep.uf,
          cep: cep ? String(cep).padStart(8, '0') : rep.cep,
          endereco: endereco || rep.endereco,
          bairro: bairro || rep.bairro,
        }
      });
      console.log(`Updated rep ${repCode} (${fullName})`);
    }
  }

  console.log('Done syncing rep details!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
