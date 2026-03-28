const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const result = await prisma.user.update({
    where: { username: 'admin' },
    data: { password: hashedPassword }
  });
  
  console.log('Password reset successfully for:', result.username);
  await prisma.$disconnect();
}

main().catch(console.error);
