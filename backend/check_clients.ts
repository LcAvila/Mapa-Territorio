
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.cliente.findMany({
    take: 10,
    where: {
      latitude: { not: null }
    }
  });

  console.log(JSON.stringify(clients.map(c => ({
    id: c.id_cliente,
    name: c.nome_cliente,
    address: c.endereco_completo,
    neighborhood: c.bairro,
    city: c.cidade,
    lat: c.latitude,
    lon: c.longitude
  })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
