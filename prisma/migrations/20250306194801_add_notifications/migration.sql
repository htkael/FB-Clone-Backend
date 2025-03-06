-- CreateTable
CREATE TABLE "Notifcation" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "fromUserId" INTEGER,

    CONSTRAINT "Notifcation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notifcation" ADD CONSTRAINT "Notifcation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifcation" ADD CONSTRAINT "Notifcation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
