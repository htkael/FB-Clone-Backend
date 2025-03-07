-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guesExpiry" TIMESTAMP(3),
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;
