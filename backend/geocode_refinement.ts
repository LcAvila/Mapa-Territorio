
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function geocode(query: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br&addressdetails=1`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'MapaTerritorio-Geocode-Refinement/1.3' }
    });
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
  } catch (error) {
    console.error(`Error geocoding ${query}:`, error);
  }
  return null;
}

// Clean DF addresses (Q -> Quadra, CNG -> Taguatinga Norte, etc)
function cleanDFAddress(addr: string) {
    let clean = addr.replace(/\bQ\b/g, 'Quadra')
                  .replace(/\bAE\b/g, 'Area Especial')
                  .replace(/\bSN\b/g, '')
                  .replace(/LT\s+\d+/g, '') // Remove Lote numbers if they confuse
                  .replace(/CONJUNTO\s+[A-Z\d]+/g, '')
                  .trim();
    return clean;
}

async function main() {
  const clients = await prisma.cliente.findMany();
  console.log(`Starting intelligent geocode refinement for ${clients.length} clients...`);

  let count = 0;
  for (const client of clients) {
    count++;
    const addr = client.endereco_completo || '';
    const bairro = client.bairro || '';
    const city = client.cidade || '';
    const uf = client.uf || '';

    // Variations to try
    const attempts = [
        // 1. Full cleaned address
        `${cleanDFAddress(addr)}, ${bairro}, ${city}, ${uf}, Brazil`,
        // 2. Just address + city (sometimes bairro is wrong)
        `${cleanDFAddress(addr)}, ${city}, ${uf}, Brazil`,
        // 3. Just the "Quadra" or sector part + city
        `${addr.split(',')[0]}, ${city}, ${uf}, Brazil`,
        // 4. Neighborhood centroid (fallback for accuracy check)
        `${bairro}, ${city}, ${uf}, Brazil`
    ];

    let found = false;
    for (const query of attempts) {
        if (!query || query.length < 10) continue;
        
        const res = await geocode(query);
        // We only accept results that are more precise than a "State" or "City" result
        // unless it's our last resort (attempt 4).
        if (res && (res.place_rank > 15 || attempts.indexOf(query) === 3)) {
            await prisma.cliente.update({
                where: { id_cliente: client.id_cliente },
                data: { latitude: parseFloat(res.lat), longitude: parseFloat(res.lon) }
            });
            console.log(`[${count}/${clients.length}] SUCCESS (${res.type}, rank ${res.place_rank}): ${client.nome_cliente}`);
            found = true;
            break;
        }
        await sleep(1000); // Nominatim rate limit
    }

    if (!found) {
        console.log(`[${count}/${clients.length}] FAILED: ${client.nome_cliente}`);
    }
  }

  console.log('Intelligent geocode refinement complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
