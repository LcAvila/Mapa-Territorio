const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const username = 'admin';
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { code: username },
          { username: username },
          { code: username.toUpperCase() },
          { username: username.toLowerCase() },
          { code: username.toLowerCase() },
          { username: username.toUpperCase() }
        ]
      }
    });

    console.log('SUCCESS:', user ? user.username : 'Not found');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
