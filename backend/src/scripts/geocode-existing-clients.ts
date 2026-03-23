import { prisma } from '../prisma';
import { geocodeAddress } from '../utils/geocoding';
import pc from 'picocolors';

async function main() {
  console.log(pc.cyan('\n🚀 Iniciando script de Geocodificação em Massa (Limpeza de Precisão)'));
  console.log(pc.gray('──────────────────────────────────────────────────'));

  // 1. Buscar todos os clientes (especialmente os sem coordenadas ou que precisam de precisão)
  const clientes = await prisma.cliente.findMany({
    orderBy: { nome_cliente: 'asc' }
  });

  console.log(pc.white(`📦 Encontrados ${clientes.length} clientes para processar.`));

  let sucessos = 0;
  let erros = 0;
  let pulados = 0;

  for (let i = 0; i < clientes.length; i++) {
    const cliente = clientes[i];
    const searchAddress = cliente.endereco_completo || 
                         `${cliente.bairro ? cliente.bairro + ', ' : ''}${cliente.cidade}, ${cliente.uf}, Brasil`;

    process.stdout.write(pc.gray(`[${i + 1}/${clientes.length}] Processando: ${pc.white(cliente.nome_cliente.substring(0, 20))}... `));

    try {
      // Pequeno delay para evitar overload na API (embora HERE suporte muito, é seguro para rede)
      await new Promise(resolve => setTimeout(resolve, 200));

      const coords = await geocodeAddress(searchAddress);

      if (coords) {
        await prisma.cliente.update({
          where: { id_cliente: cliente.id_cliente },
          data: {
            latitude: coords.lat,
            longitude: coords.lng
          }
        });
        console.log(pc.green('SUCESSO ✅'));
        sucessos++;
      } else {
        console.log(pc.yellow('ENDEREÇO NÃO ENCONTRADO ❓'));
        erros++;
      }
    } catch (error) {
      console.log(pc.red('ERRO ❌'));
      erros++;
    }
  }

  console.log(pc.gray('──────────────────────────────────────────────────'));
  console.log(pc.cyan('✨ Processamento concluído!'));
  console.log(`${pc.green(`✅ Sucessos: ${sucessos}`)} | ${pc.yellow(`❓ Falhas: ${erros}`)} | ${pc.gray(`Total: ${clientes.length}`)}`);
  console.log(pc.cyan('──────────────────────────────────────────────────\n'));
}

main()
  .catch((e) => {
    console.error(pc.red('Erro fatal no script:'), e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
