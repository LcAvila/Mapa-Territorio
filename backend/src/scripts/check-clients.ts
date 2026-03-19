import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clientes = await prisma.cliente.findMany({ 
    where: { repCode: '10' }, 
    select: { nome_cliente: true, latitude: true, longitude: true, uf: true, cidade: true }
  });
  console.log(`Total: ${clientes.length}`);
  console.log('With coords:', clientes.filter(c => c.latitude && c.longitude).length);
  console.log('Without coords:', clientes.filter(c => !c.latitude || !c.longitude).length);
  console.log(JSON.stringify(clientes.slice(0, 3), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
