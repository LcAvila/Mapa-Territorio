const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const statements = [
  'ALTER TABLE "route_sequences" ADD COLUMN IF NOT EXISTS "semana" TEXT',
  'ALTER TABLE "route_sequences" ADD COLUMN IF NOT EXISTS "name" TEXT',
  `CREATE TABLE IF NOT EXISTS "notification_seen" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_seen_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "notification_seen_notificationId_userId_key"
    ON "notification_seen"("notificationId", "userId")`,
  `ALTER TABLE "notification_seen"
    ADD CONSTRAINT "notification_seen_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "notifications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "notification_seen"
    ADD CONSTRAINT "notification_seen_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "senderName" TEXT DEFAULT 'Sistema'`,
  'CREATE INDEX IF NOT EXISTS "route_cycles_supervisor_user_id_idx" ON "route_cycles"("supervisor_user_id")',
  'CREATE INDEX IF NOT EXISTS "route_sequences_route_cycle_id_idx" ON "route_sequences"("route_cycle_id")',
  'CREATE INDEX IF NOT EXISTS "route_sequences_week_id_idx" ON "route_sequences"("week_id")',
  'CREATE INDEX IF NOT EXISTS "route_sequences_supervisor_user_id_idx" ON "route_sequences"("supervisor_user_id")',
  'CREATE INDEX IF NOT EXISTS "route_sequence_items_route_sequence_id_idx" ON "route_sequence_items"("route_sequence_id")',
  'CREATE INDEX IF NOT EXISTS "route_sequence_items_client_snapshot_id_idx" ON "route_sequence_items"("client_snapshot_id")',
  'CREATE INDEX IF NOT EXISTS "user_permissions_userId_idx" ON "user_permissions"("userId")',
  'CREATE INDEX IF NOT EXISTS "user_permissions_moduleId_idx" ON "user_permissions"("moduleId")',
];

async function runStatement(sql) {
  const preview = sql.replace(/\s+/g, ' ').slice(0, 72);
  console.log(`Running: ${preview}...`);
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('  OK');
    return true;
  } catch (err) {
    const msg = err.message || String(err);
    if (
      msg.includes('already exists') ||
      msg.includes('duplicate') ||
      msg.includes('42710')
    ) {
      console.log('  SKIP (already applied)');
      return true;
    }
    console.error('  FAIL:', msg);
    return false;
  }
}

async function main() {
  for (const sql of statements) {
    await runStatement(sql);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
