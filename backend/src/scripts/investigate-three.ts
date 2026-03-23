import { prisma } from '../prisma';

async function main() {
  const fragmentos = [
    'J L COMERCIO',
    'REP PAPELARIA',
    'PINHEIRO PRODUTOS'
  ];

  const clientes = await prisma.cliente.findMany({
    where: {
      OR: fragmentos.map(f => ({
        nome_cliente: {
          contains: f,
          mode: 'insensitive'
        }
      }))
    }
  });

  console.log(JSON.stringify(clientes, null, 2));
}

main().finally(() => prisma.$disconnect());
