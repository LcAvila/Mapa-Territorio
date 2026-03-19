import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const reps = await prisma.representative.findMany({ take: 5 });
        console.log('Successfully connected to DB! Representatives found:', reps.length);
        const users = await prisma.user.findMany({ take: 5 });
        console.log('Users found:', users.length);
    } catch (e) {
        console.error('Database connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
