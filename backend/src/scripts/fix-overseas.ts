import { prisma } from '../prisma';
import { geocodeAddress } from '../utils/geocoding';
import pc from 'picocolors';

// Limites aproximados do Brasil
const LAT_MIN = -34.0;
const LAT_MAX = 6.0;
const LNG_MIN = -74.0;
const LNG_MAX = -34.0;

async function main() {
  console.log(pc.cyan('\n🌎 Iniciando correção de clientes fora do Brasil'));
  console.log(pc.gray('──────────────────────────────────────────────────'));

  // Buscar clientes que estão fora da "caixa" do Brasil
  const clientesNoExterior = await prisma.cliente.findMany({
    where: {
      OR: [
        { latitude: { gt: LAT_MAX } },
        { latitude: { lt: LAT_MIN } },
        { longitude: { gt: LNG_MAX } },
        { longitude: { lt: LNG_MIN } }
      ]
    }
  });

  if (clientesNoExterior.length === 0) {
    console.log(pc.green('Nenhum cliente detectado fora do Brasil! ✅'));
    return;
  }

  console.log(pc.yellow(`⚠️ Detectados ${clientesNoExterior.length} clientes possivelmente fora do Brasil.`));

  let corrigidos = 0;

  for (let i = 0; i < clientesNoExterior.length; i++) {
    const cliente = clientesNoExterior[i];
    const searchAddress = cliente.endereco_completo || 
                         `${cliente.bairro ? cliente.bairro + ', ' : ''}${cliente.cidade}, ${cliente.uf}`;

    process.stdout.write(pc.gray(`[${i + 1}/${clientesNoExterior.length}] Corrigindo: ${pc.white(cliente.nome_cliente.substring(0, 20))}... `));

    try {
      // Pequeno delay para API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const coords = await geocodeAddress(searchAddress);

      if (coords) {
        await prisma.cliente.update({
          where: { id_cliente: cliente.id_cliente },
          data: {
            latitude: coords.lat,
            longitude: coords.lng
          }
        });
        console.log(pc.green('REPOSICIONADO NO BRASIL 🎯'));
        corrigidos++;
      } else {
        console.log(pc.red('FALHA AO ENCONTRAR NO BRASIL ❓'));
      }
    } catch (error) {
      console.log(pc.red('ERRO ❌'));
    }
  }

  console.log(pc.gray('──────────────────────────────────────────────────'));
  console.log(pc.cyan('✨ Correção concluída!'));
  console.log(pc.green(`✅ Clientes trazidos de volta ao Brasil: ${corrigidos}`));
  console.log(pc.gray('──────────────────────────────────────────────────\n'));
}

main().finally(() => prisma.$disconnect());
