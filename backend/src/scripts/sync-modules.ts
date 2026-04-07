import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const modules = [
    { id: 'dashboard', name: 'Dashboard Principal' },
    { id: 'mapa', name: 'Mapa Interativo' },
    { id: 'users', name: 'Gerenciamento Usuários' },
    { id: 'clientes', name: 'Cadastro Clientes' },
    { id: 'territories', name: 'Gestão Territórios' },
    { id: 'reps', name: 'Equipe Representantes' },
    { id: 'logistica', name: 'Planejamento Logístico' },
    { id: 'interests', name: 'Gestão de Interesses' },
    { id: 'notifications', name: 'Central de Alertas' },
    { id: 'audit', name: 'Logs de Auditoria' },
    { id: 'routes', name: 'Gestão de Rotas' }
  ];

  console.log('Sincronizando módulos...');
  for (const mod of modules) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: { name: mod.name },
      create: mod
    });
  }
  console.log('Módulos sincronizados com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao sincronizar módulos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
