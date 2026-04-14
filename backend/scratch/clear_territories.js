const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const before = await prisma.territory.count();
  await prisma.territory.deleteMany({});
  const after = await prisma.territory.count();
  console.log(`✅ Territórios removidos: ${before - after} (restam ${after})`);
}

main().finally(() => prisma.$disconnect());
