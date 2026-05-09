import { prisma } from '../prisma';

async function main() {
  console.log('Starting data migration: repCode -> userId');

  // 1. Get all users with repCode
  const users = await prisma.user.findMany({
    where: { repCode: { not: null } },
    select: { id: true, repCode: true }
  });

  console.log(`Found ${users.length} users with repCode.`);

  for (const user of users) {
    const repCode = user.repCode;
    const userId = user.id;

    // Update Clientes
    // @ts-ignore - columns might not be in prisma types yet if I haven't generated
    const clientes = await prisma.$executeRawUnsafe(
      'UPDATE "clientes" SET "userId" = $1 WHERE "repCode" = $2',
      userId, repCode
    );
    if (clientes > 0) console.log(`- Updated ${clientes} clients for user ${userId} (${repCode})`);

    // Update Territories
    const territories = await prisma.$executeRawUnsafe(
      'UPDATE "territories" SET "userId" = $1 WHERE "repCode" = $2',
      userId, repCode
    );
    if (territories > 0) console.log(`- Updated ${territories} territories for user ${userId} (${repCode})`);

    // Update Bairros
    const bairros = await prisma.$executeRawUnsafe(
      'UPDATE "bairros" SET "userId" = $1 WHERE "repCode" = $2',
      userId, repCode
    );
    if (bairros > 0) console.log(`- Updated ${bairros} bairros for user ${userId} (${repCode})`);

    // Update Interest Requests
    const interests = await prisma.$executeRawUnsafe(
      'UPDATE "interest_requests" SET "userId" = $1 WHERE "repCode" = $2',
      userId, repCode
    );
    if (interests > 0) console.log(`- Updated ${interests} interest requests for user ${userId} (${repCode})`);
  }

  console.log('Data migration complete.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
