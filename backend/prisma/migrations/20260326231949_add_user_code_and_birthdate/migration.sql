/*
  Warnings:

  - You are about to drop the `representatives` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[repCode]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "bairros" DROP CONSTRAINT "bairros_repCode_fkey";

-- DropForeignKey
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_repCode_fkey";

-- DropForeignKey
ALTER TABLE "territories" DROP CONSTRAINT "territories_repCode_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_repCode_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "code" TEXT,
ADD COLUMN     "colorIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "comissao" DOUBLE PRECISION,
ADD COLUMN     "isVago" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "representatives";

-- CreateIndex
CREATE UNIQUE INDEX "users_repCode_key" ON "users"("repCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_code_key" ON "users"("code");

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_repCode_fkey" FOREIGN KEY ("repCode") REFERENCES "users"("repCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bairros" ADD CONSTRAINT "bairros_repCode_fkey" FOREIGN KEY ("repCode") REFERENCES "users"("repCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_repCode_fkey" FOREIGN KEY ("repCode") REFERENCES "users"("repCode") ON DELETE SET NULL ON UPDATE CASCADE;
