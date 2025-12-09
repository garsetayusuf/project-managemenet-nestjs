import { PrismaClient } from '../generated/prisma/client';
import * as dotenv from 'dotenv';
import ansis from 'ansis';
import { seedUsers } from './seeds/users';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Add your seed functions to this array to have them automatically executed
 * Each seed function should accept a PrismaClient instance as its parameter
 */
const seedFunctions = [seedUsers];

async function main() {
  dotenv.config();
  console.log('\n' + ansis.blue.bold('🌱 Starting database seeding...\n'));

  // Run all seed functions in sequence
  for (const seedFunction of seedFunctions) {
    await seedFunction(prisma);
  }

  console.log(ansis.blue.bold('🎉 Database seeding completed!\n'));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
