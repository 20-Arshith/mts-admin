const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRawUnsafe('UPDATE announcements SET start_at = NOW() WHERE start_at IS NULL');
  console.log(`Updated ${result} rows`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
