const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { code: 'admin' },
        { username: 'admin' },
        { code: 'ADMIN' },
        { username: 'ADMIN' }
      ]
    }
  });
  console.log('USERS FOUND:', users.map(u => ({ id: u.id, username: u.username, code: u.code, role: u.role, tipo: u.tipo })));
  await prisma.$disconnect();
}
main();
