import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
console.log('User model fields:', Object.keys((prisma as any).user.fields || {}));
console.log('Prisma DMMF:', JSON.stringify((prisma as any)._dmmf?.modelMap?.User?.fields?.map((f: any) => f.name)));
prisma.$disconnect();
