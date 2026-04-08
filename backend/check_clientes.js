const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Buscando os últimos clientes cadastrados ---');
    const clientes = await prisma.cliente.findMany({ 
        orderBy: { data_cadastro: 'desc' }, 
        take: 5,
        select: {
            id_cliente: true,
            nome_cliente: true,
            endereco_completo: true,
            latitude: true,
            longitude: true,
            data_cadastro: true
        }
    });
    console.log(JSON.stringify(clientes, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
