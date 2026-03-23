import { prisma } from '../prisma';
import pc from 'picocolors';

async function main() {
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  const total = await prisma.cliente.count();
  const atualizadosHoje = await prisma.cliente.count({
    where: {
      data_atualizacao: {
        gte: hoje
      }
    }
  });

  console.log(pc.cyan('\n🔍 Análise de Atualização Retroativa'));
  console.log(pc.gray('──────────────────────────────────────────────────'));
  console.log(pc.white(`Total de Clientes  : ${total}`));
  console.log(pc.green(`Atualizados Hoje   : ${atualizadosHoje} (Precisão HERE)`));
  console.log(pc.yellow(`Mantidos Antigos   : ${total - atualizadosHoje}`));

  if (total - atualizadosHoje > 0) {
    console.log(pc.cyan('\n📍 Clientes que mantiveram coordenadas antigas:'));
    const antigos = await prisma.cliente.findMany({
      where: {
        data_atualizacao: {
          lt: hoje
        }
      },
      select: { nome_cliente: true, endereco_completo: true, cidade: true, uf: true }
    });
    antigos.forEach((f, i) => {
      const addr = f.endereco_completo || `${f.cidade || ''}, ${f.uf || ''}`;
      console.log(`${pc.gray(`[${i+1}]`)} ${pc.white(f.nome_cliente.padEnd(25))} | Endereço: ${pc.yellow(addr)}`);
    });
  }

  console.log(pc.gray('──────────────────────────────────────────────────\n'));
}

main().finally(() => prisma.$disconnect());
