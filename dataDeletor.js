const prisma = require("./prisma/client");

const main = async () => {
  console.log("Starting database cleanup...");

  try {
    console.log("Deleting notifications...");
    await prisma.notification.deleteMany({});

    console.log("Deleting likes...");
    await prisma.like.deleteMany({});

    console.log("Deleting comments...");
    await prisma.comment.deleteMany({});

    console.log("Deleting messages...");
    await prisma.message.deleteMany({});

    console.log("Deleting conversation participants...");
    await prisma.conversationParticipant.deleteMany({});

    console.log("Deleting conversations...");
    await prisma.conversation.deleteMany({});

    console.log("Deleting friend relationships...");
    await prisma.friend.deleteMany({});

    console.log("Deleting posts...");
    await prisma.post.deleteMany({});

    console.log("Deleting users...");
    await prisma.user.deleteMany({});

    console.log("Database cleanup completed successfully!");
  } catch (error) {
    console.error("Error during database cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
};

main();
