import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.representative.count();
  const reps = await prisma.representative.findMany({ take: 5 });
  console.log(`Total Representatives: ${count}`);
  console.log('Sample Reps:', JSON.stringify(reps, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
