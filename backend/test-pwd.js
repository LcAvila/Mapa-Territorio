const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { username: 'admin' } });
  
  console.log('User password hash:', user.password);
  
  const isValidAdmin123 = await bcrypt.compare('admin123', user.password);
  console.log('admin123 matches:', isValidAdmin123);

  const isValidAdmin = await bcrypt.compare('admin', user.password);
  console.log('admin matches:', isValidAdmin);
  
  await prisma.$disconnect();
}
main();
