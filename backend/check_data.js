
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientsCount = await prisma.cliente.count();
  console.log('Total Clients in Cliente table:', clientsCount);
  
  const users = await prisma.user.findMany({
    select: { tipo: true, role: true, username: true }
  });
  console.log('User types and counts:');
  const summary = users.reduce((acc, u) => {
    const key = `${u.tipo}:${u.role}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log(summary);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
