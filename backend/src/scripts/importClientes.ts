import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  const filePath = 'C:\\Users\\Avila\\Documents\\Mapa-Territorio\\frontend\\public\\Clientes\\Clientes.xlsx';
  
  console.log(`Lendo arquivo: ${filePath}`);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(worksheet);

  let insertedCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  console.log(`Iniciando importação de ${data.length} registros...`);

  for (const row of data as any[]) {
    try {
      const codigo_cliente = row['Cod Cliente - Matriz']?.toString();
      const nome_cliente = row['Cliente']?.toString();

      if (!nome_cliente) {
        continue; // Ignorar linhas vazias sem nome
      }

      const dataObj = {
          nome_cliente: nome_cliente,
          nome_abreviado: row['Nome Abreviado - Matriz']?.toString(),
          regiao: row['Região']?.toString(),
          uf: row['UF']?.toString(),
          endereco_completo: row['Endereço']?.toString(),
          cidade: row['Cidade']?.toString(),
          bairro: row['Bairro']?.toString(),
          cep: row['CEP']?.toString(),
          cnpj: row['CNPJ']?.toString(),
      };

      if (codigo_cliente) {
        const result = await prisma.cliente.upsert({
          where: { codigo_cliente: codigo_cliente },
          update: dataObj,
          create: {
             codigo_cliente: codigo_cliente,
             ...dataObj
          }
        });
        insertedCount++;
      } else {
        // Se a linha não tiver código de cliente, apenas cria direto.
        await prisma.cliente.create({
          data: dataObj
        });
        insertedCount++;
      }
    } catch (error) {
       console.error(`Erro ao inserir cliente: ${row['Cod Cliente - Matriz']}`, error);
       errorCount++;
    }
  }

  console.log(`Importação concluída. Inseridos/Atualizados com Sucesso: ${insertedCount}. Erros: ${errorCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
