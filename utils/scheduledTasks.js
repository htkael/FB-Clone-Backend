const cron = require("node-cron");
const prisma = require("../prisma/client");

exports.scheduleGuestCleanup = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("Running guest account cleanup...");

      const expiredGuests = await prisma.user.findMany({
        where: {
          isGuest: true,
          guesExpiry: {
            lt: new Date(),
          },
        },
      });

      for (const guest of expiredGuests) {
        if (global.io) {
          global.io.emit("user:status", {
            userId: guest.id,
            status: "offline",
          });
        }
      }

      for (const guest of expiredGuests) {
        await prisma.$transaction(async (tx) => {
          await tx.notification.deleteMany({
            where: {
              OR: [{ userId: guest.id }, { fromUserId: guest.id }],
            },
          });

          await tx.message.deleteMany({
            where: {
              OR: [{ senderId: guest.id }, { receiverId: guest.id }],
            },
          });

          await tx.conversationParticipant.deleteMany({
            where: { userId: guest.id },
          });

          await tx.like.deleteMany({ where: { userId: guest.id } });
          await tx.comment.deleteMany({ where: { authorId: guest.id } });

          await tx.friend.deleteMany({
            where: {
              OR: [{ userId: guest.id }, { friendId: guest.id }],
            },
          });

          await tx.post.deleteMany({ where: { authorId: guest.id } });

          await tx.user.delete({ where: { id: guest.id } });
        });

        console.log(`Cleaned up guest account ID: ${guest.id}`);
      }

      console.log(`Cleaned up ${expiredGuests.length} expired guest accounts`);
    } catch (error) {
      console.error("Error cleaning up guest accounts:", error);
    }
  });
};
