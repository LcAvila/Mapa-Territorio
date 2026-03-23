import { prisma } from '../prisma';
import { geocodeAddress } from '../utils/geocoding';

async function main() {
  const ids = [8, 388, 591];
  for (const id of ids) {
    const c = await prisma.cliente.findUnique({ where: { id_cliente: id } });
    if (!c) continue;
    
    console.log(`\n🔎 Processando: ${c.nome_cliente}`);
    
    // Tenta primeiro com CEP + Cidade + UF + Brasil
    const q = `${c.cep || ''}, ${c.cidade || ''}, ${c.uf || ''}, Brasil`.replace(', ,', ',');
    console.log(`   Tentando query: ${q}`);
    
    let coords = await geocodeAddress(q);
    
    if (!coords) {
      console.log('   Falha com CEP, tentando apenas Cidade, UF, Brasil');
      coords = await geocodeAddress(`${c.cidade}, ${c.uf}, Brasil`);
    }

    if (coords) {
      await prisma.cliente.update({
        where: { id_cliente: id },
        data: {
          latitude: coords.lat,
          longitude: coords.lng
        }
      });
      console.log(`   ✅ SUCESSO: Lat: ${coords.lat}, Lng: ${coords.lng}`);
    } else {
      console.log('   ❌ FALHA CRÍTICA: Não foi possível localizar nem a cidade.');
    }
  }
}

main().finally(() => prisma.$disconnect());
