import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Nominatim geocoding (free, no API key needed, rate limited to 1/sec)
async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    await new Promise(r => setTimeout(r, 1200)); // respect 1 req/sec rate limit
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MapaTerritorio-GeocodingBot/1.0' }
    });
    const data: any[] = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch (e) {
    console.error('Geocode error:', e);
    return null;
  }
}

async function main() {
  // Get all clients WITHOUT coordinates
  const clients = await prisma.cliente.findMany({
    where: { 
      OR: [{ latitude: null }, { longitude: null }]
    },
    select: { id_cliente: true, nome_cliente: true, cidade: true, uf: true, endereco_completo: true, cep: true }
  });

  console.log(`Found ${clients.length} clients without coordinates. Starting geocoding...`);

  let success = 0;
  let failed = 0;

  for (const client of clients) {
    // Build a progressive search query (most specific to least specific)
    let query = '';
    if (client.endereco_completo && client.cidade && client.uf) {
      query = `${client.endereco_completo}, ${client.cidade}, ${client.uf}, Brasil`;
    } else if (client.cidade && client.uf) {
      query = `${client.cidade}, ${client.uf}, Brasil`;
    } else if (client.uf) {
      query = `${client.uf}, Brasil`;
    } else {
      console.log(`Skipping ${client.nome_cliente} — no location data`);
      failed++;
      continue;
    }

    console.log(`Geocoding [${client.id_cliente}] ${client.nome_cliente} → ${query}`);
    let coords = await geocode(query);

    // Fallback to just city + UF if full address fails
    if (!coords && client.cidade && client.uf) {
      console.log(`  Retrying with city only: ${client.cidade}, ${client.uf}`);
      coords = await geocode(`${client.cidade}, ${client.uf}, Brasil`);
    }

    if (coords) {
      await prisma.cliente.update({
        where: { id_cliente: client.id_cliente },
        data: { latitude: coords.lat, longitude: coords.lon }
      });
      console.log(`  ✓ ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);
      success++;
    } else {
      console.log(`  ✗ Could not geocode`);
      failed++;
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
