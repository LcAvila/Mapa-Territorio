import { PrismaClient } from '@prisma/client';
import { geocodeAddress } from './src/utils/geocoding';

const prisma = new PrismaClient();

async function main() {
  console.log('Procurando clientes sem latitude ou longitude...');
  const clientes = await prisma.cliente.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null }
      ]
    }
  });

  if (clientes.length === 0) {
    console.log('Todos os clientes já possuem coordenadas cadastradas!');
    return;
  }

  console.log(`Encontrados ${clientes.length} clientes precisando de coordenadas. Iniciando geocodificação via Nominatim...`);

  for (const cliente of clientes) {
    const enderecoBusca = cliente.endereco_completo || 
                         `${cliente.bairro ? cliente.bairro + ', ' : ''}${cliente.cidade}, ${cliente.uf}`;
    
    if (!enderecoBusca || enderecoBusca.trim() === 'undefined, undefined') {
       console.log(`[Pulo] Cliente ${cliente.nome_cliente} não possui endereço ou cidade/uf válido.`);
       continue;
    }

    console.log(`Geocodificando cliente: ${cliente.nome_cliente} -> ${enderecoBusca}`);
    const result = await geocodeAddress(enderecoBusca);

    if (result && result.lat && result.lng) {
      await prisma.cliente.update({
        where: { id_cliente: cliente.id_cliente },
        data: {
          latitude: result.lat,
          longitude: result.lng
        }
      });
      console.log(`[Sucesso] Coordenadas salvas: ${result.lat}, ${result.lng}`);
    } else {
      console.log(`[Falha] Não foi possível encontrar coordenadas para o endereço.`);
    }

    // sleep 1 second to respect Nominatim rate limit (1 request/second)
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('Processo de geocodificação concluído!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
