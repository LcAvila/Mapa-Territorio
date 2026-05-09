import { prisma } from '../prisma';

async function main() {
  console.log('Cleaning up orphan userId in interest_requests...');
  const result = await prisma.$executeRawUnsafe(
    'UPDATE "interest_requests" SET "userId" = NULL WHERE "userId" NOT IN (SELECT id FROM users) AND "userId" IS NOT NULL'
  );
  console.log(`Updated ${result} rows.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
