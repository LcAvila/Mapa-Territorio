import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.cliente.findMany({
    select: {
      id_cliente: true,
      nome_cliente: true,
      latitude: true,
      longitude: true,
      uf: true
    }
  });

  console.log(`Checking ${clients.length} clients...`);

  const offMap = clients.filter(c => {
    if (!c.latitude || !c.longitude) return false;
    
    // Basic Brazil bounding box roughly:
    // Lat: 6 to -34
    // Lon: -34 to -74
    const isInsideBrazilBox = 
      c.latitude <= 6 && c.latitude >= -34 &&
      c.longitude <= -34 && c.longitude >= -74;
      
    return !isInsideBrazilBox;
  });

  console.log(`Found ${offMap.length} clients potentially off-map (outside Brazil bounding box):`);
  offMap.forEach(c => {
    console.log(`- ID: ${c.id_cliente}, Name: ${c.nome_cliente}, Lat: ${c.latitude}, Lon: ${c.longitude}, UF: ${c.uf}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
