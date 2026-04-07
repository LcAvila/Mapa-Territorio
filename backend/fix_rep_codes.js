const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.user.updateMany({ 
        where: { repCode: '' },
        data: { repCode: null }
    });
    console.log('Fixed users count:', updated.count);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
