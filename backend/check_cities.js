
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cities = await prisma.cliente.groupBy({
    by: ['cidade', 'uf'],
    _count: {
      id_cliente: true
    },
    orderBy: {
      _count: {
        id_cliente: 'desc'
      }
    },
    take: 10
  });

  console.log('Top cities:');
  cities.forEach(c => {
    console.log(`${c.cidade}/${c.uf}: ${c._count.id_cliente} clientes`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
