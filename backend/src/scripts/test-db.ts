import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ override: true });

const prisma = new PrismaClient();

async function test() {
  console.log('Testing connection...');
  try {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Connection successful:', result);
  } catch (e: any) {
    console.error('Connection failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
