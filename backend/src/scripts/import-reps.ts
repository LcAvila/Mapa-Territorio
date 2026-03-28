import * as xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const filePath = 'C:\\Users\\Avila\\Desktop\\Mapa-Territorio\\frontend\\public\\Representantes\\Login Rep.xlsx';
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);

  console.log(`Found ${rows.length} rows to import.`);

  for (const row of rows) {
    const username = String(row['Cod login']).trim();
    const passwordRaw = String(row['Pass login']).trim();
    const fullName = row['Nome'] ? String(row['Nome']).trim() : null;

    if (!username || !passwordRaw || username === 'undefined') {
      console.log('Skipping row missing login/pass:', row);
      continue;
    }

    // Derive repCode from the login itself: REP010 → strip 'REP' → '010' → remove leading zeros → '10'
    const repCode = username.replace(/^REP/i, '').replace(/^0+/, '') || '0';

    // Verify the representative exists in the DB (now via User model)
    const rep = await prisma.user.findUnique({ where: { repCode } });

    const existing = await prisma.user.findUnique({ where: { username } });
    const hashedPassword = await bcrypt.hash(passwordRaw, 10);

    if (existing) {
      console.log(`Updating existing user ${username} → repCode=${repCode}`);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          repCode,
          password: hashedPassword,
          full_name: fullName || existing.full_name,
          role: 'representante',
          tipo: 'representante',
        }
      });
      continue;
    }

    if (rep) {
      console.log(`Updating existing representative by repCode ${repCode} to new username ${username}`);
      await prisma.user.update({
        where: { id: rep.id },
        data: {
          username,
          password: hashedPassword,
          full_name: fullName || rep.full_name,
          role: 'representante',
          tipo: 'representante',
        }
      });
      continue;
    }

    // Attempt to create if neither exist.
    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        full_name: fullName,
        role: 'representante',
        tipo: 'representante',
        repCode,
      }
    });
    console.log(`Created user ${username} → repCode=${repCode}`);
  }

  console.log('Done!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
