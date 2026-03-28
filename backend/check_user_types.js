
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { tipo: true }
  });
  const tipos = [...new Set(users.map(u => u.tipo))];
  console.log('Unique types:', tipos);
  
  const counts = tipos.map(t => ({
    tipo: t,
    count: users.filter(u => u.tipo === t).length
  }));
  console.log('Counts:', counts);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
