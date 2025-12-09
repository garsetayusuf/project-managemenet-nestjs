import 'dotenv/config';
import { PrismaClient } from '../../generated/prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import ansis from 'ansis';

const seedEmail = faker.internet.email({ provider: 'example.com' });
const passwordSaltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS || '10', 10);

export async function seedUsers(prisma: PrismaClient) {
  console.log(ansis.cyan('📋 Seeding users...'));

  const existingUser = await prisma.user.findUnique({
    where: { email: seedEmail },
  });

  if (existingUser) {
    console.log(ansis.yellow(`  - User ${seedEmail} already exists, skipping`));
    return;
  }

  const hashedPassword = await bcrypt.hash('password123', passwordSaltRounds);
  const user = await prisma.user.create({
    data: {
      email: seedEmail,
      name: faker.person.fullName(),
      password: hashedPassword,
    },
  });

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: faker.company.catchPhrase(),
        description: faker.lorem.paragraph(),
        userId: user.id,
        tasks: {
          create: [
            {
              title: faker.hacker.phrase(),
              description: faker.lorem.sentence(),
              status: 'PENDING',
              priority: 'HIGH',
              dueDate: faker.date.future(),
              userId: user.id,
            },
            {
              title: faker.hacker.phrase(),
              description: faker.lorem.sentence(),
              status: 'IN_PROGRESS',
              priority: 'MEDIUM',
              dueDate: faker.date.soon(),
              userId: user.id,
            },
          ],
        },
      },
      include: { tasks: true },
    }),
    prisma.project.create({
      data: {
        name: faker.company.catchPhrase(),
        description: faker.lorem.paragraph(),
        userId: user.id,
        tasks: {
          create: [
            {
              title: faker.hacker.phrase(),
              description: faker.lorem.sentence(),
              status: 'DONE',
              priority: 'LOW',
              dueDate: faker.date.past(),
              userId: user.id,
            },
            {
              title: faker.hacker.phrase(),
              description: faker.lorem.sentence(),
              status: 'PENDING',
              priority: 'URGENT',
              dueDate: null,
              userId: user.id,
            },
          ],
        },
      },
      include: { tasks: true },
    }),
  ]);

  console.log(ansis.green(`  ✓ User ${user.name} (${user.email}) seeded`));
  console.log(ansis.green(`    - ${projects.length} projects created`));
  projects.forEach((project) => {
    console.log(
      ansis.green(`      • ${project.name}: ${project.tasks.length} tasks`),
    );
  });

  console.log(ansis.green.bold('\n✨ Users seeded successfully!\n'));
}
