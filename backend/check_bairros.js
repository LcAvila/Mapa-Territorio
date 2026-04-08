const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.bairro.count();
  console.log(`Total bairros: ${count}`);
  
  const sample = await prisma.bairro.findMany({
    take: 10
  });
  console.log('Sample:', JSON.stringify(sample, null, 2));

  const byMun = await prisma.bairro.groupBy({
    by: ['municipio', 'uf'],
    _count: {
      id: true
    }
  });
  console.log('By Municipality:', JSON.stringify(byMun, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
