import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to wait
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const clients = await prisma.cliente.findMany({
    where: {
      latitude: { not: undefined }, // We'll re-geocode those that might be wrong
    },
    select: {
      id_cliente: true,
      nome_cliente: true,
      endereco_completo: true,
      bairro: true,
      cidade: true,
      uf: true,
      cep: true
    }
  });

  console.log(`Starting geocoding for ${clients.length} clients...`);
  console.log(`This will take approximately ${Math.round(clients.length / 60)} minutes.`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < clients.length; i++) {
    const c = clients[i];
    
    // Construct search query
    // Example: Rua X, Bairro Y, Cidade Z, UF, Brazil
    const queryParts = [
      c.endereco_completo,
      c.bairro,
      c.cidade,
      c.uf,
      'Brazil'
    ].filter(Boolean);
    
    const query = queryParts.join(', ');
    
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MapaTerritorio-App/1.1 (lucas.avila.dev@gmail.com; territory-mapping-tool)'
        }
      });
      
      if (response.status === 403) {
        console.error(`[${i+1}/${clients.length}] 403 Access Denied. Rate limit or blocked IP.`);
        fail++;
        await delay(5000); // Wait longer if blocked
        continue;
      }

      if (!response.ok) {
        console.error(`[${i+1}/${clients.length}] HTTP Error: ${response.status}`);
        fail++;
        continue;
      }

      const data = await response.json() as any[];
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        await prisma.cliente.update({
          where: { id_cliente: c.id_cliente },
          data: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
          }
        });
        success++;
        console.log(`[${i+1}/${clients.length}] Success: ${c.nome_cliente} -> ${lat}, ${lon}`);
      } else {
        // Try a broader search (city center) if specific address fails
        const broaderQuery = `${c.cidade}, ${c.uf}, Brazil`;
        const broaderUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(broaderQuery)}&format=json&limit=1`;
        
        await delay(1200); // respects limit
        const broadRes = await fetch(broaderUrl, {
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'MapaTerritorio-App/1.1 (lucas.avila.dev@gmail.com; territory-mapping-tool)'
          }
        });

        if (!broadRes.ok) {
          console.error(`[${i+1}/${clients.length}] Broader HTTP Error: ${broadRes.status}`);
          fail++;
          continue;
        }

        const broadData = await broadRes.json() as any[];
        
        if (broadData && broadData.length > 0) {
            const { lat, lon } = broadData[0];
            await prisma.cliente.update({
              where: { id_cliente: c.id_cliente },
              data: {
                latitude: parseFloat(lat),
                longitude: parseFloat(lon)
              }
            });
            success++;
            console.log(`[${i+1}/${clients.length}] Partial Success (City Center): ${c.nome_cliente} -> ${lat}, ${lon}`);
        } else {
            fail++;
            console.log(`[${i+1}/${clients.length}] Failed: ${c.nome_cliente} (${query})`);
        }
      }
    } catch (error) {
      fail++;
      console.error(`[${i+1}/${clients.length}] Error: ${c.nome_cliente}`, error);
    }

    // Wait 1.2 seconds to respect Nominatim policy
    await delay(1200);
  }

  console.log(`Geocoding finished.`);
  console.log(`Total Success: ${success}`);
  console.log(`Total Failed: ${fail}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
