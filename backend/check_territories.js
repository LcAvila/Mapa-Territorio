const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const territories = await prisma.territory.findMany({ 
        orderBy: { id: 'desc' },
        take: 5
    });
    console.log('Result:', JSON.stringify(territories, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
