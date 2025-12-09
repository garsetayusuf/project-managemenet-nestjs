import { PrismaClient } from '../../../generated/prisma/client';
import ansis from 'ansis';

/**
 * Generic function to seed data with automatic existence checking
 * @param prisma PrismaClient instance
 * @param model The Prisma model name to seed (e.g., 'role', 'unit')
 * @param data Array of data objects to seed
 * @param uniqueField Field to check for uniqueness (e.g., 'roleName', 'unitName')
 * @param displayName Display name for logging (e.g., 'Roles', 'Units')
 */
export async function seedData<T extends Record<string, any>>(
  prisma: PrismaClient,
  model: string,
  data: T[],
  uniqueField: keyof T,
  displayName: string,
) {
  console.log(ansis.cyan(`📋 Seeding ${displayName.toLowerCase()}...`));

  for (const item of data) {
    // Dynamic where clause based on the uniqueField
    const whereClause = { [uniqueField]: item[uniqueField] };

    // Check if the item already exists
    const existingItem = await (prisma as any)[model].findFirst({
      where: whereClause,
    });

    if (existingItem) {
      console.log(
        ansis.yellow(
          `  - ${displayName.slice(0, -1)} ${ansis.white.bold(item[uniqueField])} already exists, skipping`,
        ),
      );
    } else {
      await (prisma as any)[model].create({ data: item });
      console.log(
        ansis.green(
          `  ✓ ${displayName.slice(0, -1)} ${ansis.white.bold(item[uniqueField])} seeded`,
        ),
      );
    }
  }

  console.log(ansis.green.bold(`\n✨ ${displayName} seeded successfully!\n`));
}
