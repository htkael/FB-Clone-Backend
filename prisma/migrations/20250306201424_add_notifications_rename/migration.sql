/*
  Warnings:

  - You are about to drop the `Notifcation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Notifcation" DROP CONSTRAINT "Notifcation_fromUserId_fkey";

-- DropForeignKey
ALTER TABLE "Notifcation" DROP CONSTRAINT "Notifcation_userId_fkey";

-- DropTable
DROP TABLE "Notifcation";

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "fromUserId" INTEGER,
    "postId" INTEGER,
    "commentId" INTEGER,
    "messageId" INTEGER,
    "conversationid" INTEGER,
    "friendRequestId" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
