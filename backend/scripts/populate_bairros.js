
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const data = [
  // Nova Iguaçu
  { bairro: "Adrianópolis", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Aero Clube", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Alto da Posse", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Austin", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Botafogo", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Caonze", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Centro", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Cerâmica", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Comendador Soares", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Ipiranga", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Jardim Nova Era", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Luz", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Santa Rita", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Tinguá", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Miguel Couto", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Vila de Cava", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Cabuçu", municipio: "Nova Iguaçu", uf: "RJ" },
  { bairro: "Rancho Novo", municipio: "Nova Iguaçu", uf: "RJ" },
  
  // Mesquita
  { bairro: "Alto Uruguai", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Banco de Areia", municipio: "Mesquita", uf: "RJ" },
  { bairro: "BNH", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Centro", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Chatuba", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Coréia", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Cosmorama", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Cruzeiro do Sul", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Edson Passos", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Industrial", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Jacutinga", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Juscelino", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Rocha Sobrinho", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Santa Terezinha", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Santo Elias", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Vila Emil", municipio: "Mesquita", uf: "RJ" },
  { bairro: "Vila Norma", municipio: "Mesquita", uf: "RJ" },

  // Belford Roxo
  { bairro: "Areia Branca", municipio: "Belford Roxo", uf: "RJ" },
  { bairro: "Heliópolis", municipio: "Belford Roxo", uf: "RJ" },
  { bairro: "Centro", municipio: "Belford Roxo", uf: "RJ" },
  { bairro: "Piam", municipio: "Belford Roxo", uf: "RJ" },
  { bairro: "Lote XV", municipio: "Belford Roxo", uf: "RJ" },
  { bairro: "Areia Branca", municipio: "Belford Roxo", uf: "RJ" },

  // Duque de Caxias
  { bairro: "25 de Agosto", municipio: "Duque de Caxias", uf: "RJ" },
  { bairro: "Parque Duque", municipio: "Duque de Caxias", uf: "RJ" },
  { bairro: "Vila São Luiz", municipio: "Duque de Caxias", uf: "RJ" },
  { bairro: "Gramacho", municipio: "Duque de Caxias", uf: "RJ" },
  { bairro: "Saracuruna", municipio: "Duque de Caxias", uf: "RJ" },
  { bairro: "Xerém", municipio: "Duque de Caxias", uf: "RJ" },
  { bairro: "Santa Cruz da Serra", municipio: "Duque de Caxias", uf: "RJ" },
  { bairro: "Campos Elíseos", municipio: "Duque de Caxias", uf: "RJ" },
  { bairro: "Jardim Primavera", municipio: "Duque de Caxias", uf: "RJ" },

  // Rio de Janeiro (Principais da Zona Norte/Oeste)
  { bairro: "Bangu", municipio: "Rio de Janeiro", uf: "RJ" },
  { bairro: "Campo Grande", municipio: "Rio de Janeiro", uf: "RJ" },
  { bairro: "Santa Cruz", municipio: "Rio de Janeiro", uf: "RJ" },
  { bairro: "Jacarepaguá", municipio: "Rio de Janeiro", uf: "RJ" },
  { bairro: "Recreio dos Bandeirantes", municipio: "Rio de Janeiro", uf: "RJ" },
  { bairro: "Barra da Tijuca", municipio: "Rio de Janeiro", uf: "RJ" },
  { bairro: "Realengo", municipio: "Rio de Janeiro", uf: "RJ" },
  { bairro: "Madureira", municipio: "Rio de Janeiro", uf: "RJ" },
  { bairro: "Pavuna", municipio: "Rio de Janeiro", uf: "RJ" },
  { bairro: "Irajá", municipio: "Rio de Janeiro", uf: "RJ" },
];

async function main() {
  console.log('Iniciando população de bairros...');
  
  for (const b of data) {
    const existing = await prisma.bairro.findFirst({
      where: {
        bairro: b.bairro,
        municipio: b.municipio,
        uf: b.uf
      }
    });

    if (!existing) {
      await prisma.bairro.create({ data: b });
      console.log(`Bairro criado: ${b.bairro} (${b.municipio}/${b.uf})`);
    } else {
      console.log(`Bairro já existe: ${b.bairro} (${b.municipio}/${b.uf})`);
    }
  }

  const count = await prisma.bairro.count();
  console.log(`População concluída. Total de bairros: ${count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
