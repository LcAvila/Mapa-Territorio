/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de limpeza e configuração...');

  // Create Admin if not exists
  const adminPassword = await bcrypt.hash('avila123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      full_name: 'Administrador',
      role: 'admin',
      tipo: 'admin'
    }
  });
  console.log('Administrador garantido!');

  // --- MÓDULOS DO SISTEMA ---
  const modules = [
    { id: 'dashboard', name: 'DashboardPrincipal' },
    { id: 'mapa', name: 'MapaInterativo' },
    { id: 'users', name: 'GerenciamentoUsuarios' },
    { id: 'clientes', name: 'CadastroClientes' },
    { id: 'territories', name: 'GestaoTerritorios' },
    { id: 'reps', name: 'EquipeRepresentantes' },
    { id: 'logistica', name: 'PlanejamentoLogistico' }
  ];

  for (const mod of modules) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: { name: mod.name },
      create: mod
    });
  }
  console.log('Módulos sincronizados!');

  // --- PERMISSÕES ADMIN ---
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (adminUser) {
    for (const mod of modules) {
      await (prisma as any).userPermission.upsert({
        where: {
          userId_moduleId: {
            userId: adminUser.id,
            moduleId: mod.id
          }
        },
        update: { canView: true, canEdit: true },
        create: {
          userId: adminUser.id,
          moduleId: mod.id,
          canView: true,
          canEdit: true
        }
      });
    }
    console.log('Permissões do administrador configuradas!');
  }

  // Criar grupo padrão se não existir
  await prisma.group.upsert({
    where: { name: 'Geral' },
    update: {},
    create: { name: 'Geral' }
  });

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
