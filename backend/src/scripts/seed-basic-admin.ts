import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      tipo: 'admin',
      full_name: 'Administrador'
    }
  });
  console.log('Admin user created/verified.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
