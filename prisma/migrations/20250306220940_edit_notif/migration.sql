/*
  Warnings:

  - You are about to drop the column `conversationid` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "conversationid",
ADD COLUMN     "conversationId" INTEGER;
