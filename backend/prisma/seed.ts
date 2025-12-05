import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({});

async function main() {
  console.log('🌱 Seeding database...');

  // Create default user
  const user = await prisma.user.upsert({
    where: { email: 'admin@streamline.local' },
    update: {},
    create: {
      email: 'admin@streamline.local',
      name: 'StreamLine Admin',
      role: 'admin',
      preferences: JSON.stringify({
        defaultView: 'browse',
        autoSaveInterval: 5000,
        theme: 'light',
        chatPosition: 'right',
      }),
    },
  });
  console.log('✅ Created default user:', user.email);

  // Create default categories
  const categories = [
    {
      name: 'Operations',
      description: 'Operational processes',
      path: '/operations',
      level: 0,
      order: 1,
      icon: 'cog',
      color: '#3B82F6',
      ownerId: user.id,
    },
    {
      name: 'Sales',
      description: 'Sales processes',
      path: '/sales',
      level: 0,
      order: 2,
      icon: 'trending-up',
      color: '#10B981',
      ownerId: user.id,
    },
    {
      name: 'Human Resources',
      description: 'HR processes',
      path: '/hr',
      level: 0,
      order: 3,
      icon: 'users',
      color: '#8B5CF6',
      ownerId: user.id,
    },
    {
      name: 'Finance',
      description: 'Financial processes',
      path: '/finance',
      level: 0,
      order: 4,
      icon: 'dollar-sign',
      color: '#F59E0B',
      ownerId: user.id,
    },
  ];

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { path: cat.path },
      update: {},
      create: cat,
    });
    console.log('✅ Created category:', category.name);
  }

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
