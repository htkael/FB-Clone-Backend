// updated-data-generator.js
const prisma = require("./prisma/client");
const bcrypt = require("bcrypt");
const { faker } = require("@faker-js/faker");

// Use English locale for all fake data

// Configuration
const NUM_USERS = 20;
const MIN_POSTS_PER_USER = 2;
const MAX_POSTS_PER_USER = 10;
const MIN_COMMENTS_PER_POST = 0;
const MAX_COMMENTS_PER_POST = 5;
const MIN_LIKES_PER_POST = 0;
const MAX_LIKES_PER_POST = 8;
const MIN_FRIENDS_PER_USER = 3;
const MAX_FRIENDS_PER_USER = 10;
const MIN_MESSAGES_PER_CONVERSATION = 3;
const MAX_MESSAGES_PER_CONVERSATION = 15;
const CONVERSATION_PROBABILITY = 0.7; // 70% chance of a conversation between friends
const SALT_ROUNDS = 10;

// Helper functions
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomSubset = (array, min, max) => {
  const size = getRandomInt(min, Math.min(max, array.length));
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, size);
};

const getRandomFriendStatus = () => {
  const statuses = ["PENDING", "ACCEPTED", "REJECTED"];
  const weights = [0.2, 0.7, 0.1]; // 20% pending, 70% accepted, 10% rejected

  const randomValue = Math.random();
  let cumulativeProbability = 0;

  for (let i = 0; i < statuses.length; i++) {
    cumulativeProbability += weights[i];
    if (randomValue <= cumulativeProbability) {
      return statuses[i];
    }
  }

  return "ACCEPTED";
};

// Avatar URLs from reliable sources
const getAvatarUrl = (firstName, lastName, index) => {
  // Using UI Avatars for consistent, text-based avatar generation
  return `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&size=256`;

  // Alternative reliable sources:
  // return `https://robohash.org/${firstName}${lastName}${index}?set=set4`;
  // return `https://avatars.dicebear.com/api/personas/${firstName}${lastName}${index}.svg`;
};

const createUsers = async () => {
  console.log("Creating users...");

  const hashedPassword = await bcrypt.hash("password123", SALT_ROUNDS);

  const users = [];

  for (let i = 0; i < NUM_USERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = faker.internet
      .username({ firstName, lastName })
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const user = {
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }),
      username,
      password: hashedPassword,
      profilePicUrl: getAvatarUrl(firstName, lastName, i),
      bio: faker.helpers.maybe(() => faker.lorem.paragraph(1), {
        probability: 0.7,
      }),
      isOnline: faker.helpers.maybe(() => true, { probability: 0.3 }),
      lastSeen: faker.date.recent({ days: 7 }),
    };

    users.push(user);
  }

  return await prisma.user.createMany({
    data: users,
  });
};

const createPosts = async (userIds) => {
  console.log("Creating posts...");

  const posts = [];

  for (const userId of userIds) {
    const numPosts = getRandomInt(MIN_POSTS_PER_USER, MAX_POSTS_PER_USER);

    for (let i = 0; i < numPosts; i++) {
      // No images for posts as requested
      posts.push({
        content: faker.helpers.fake(
          [
            "Just finished {{company.buzzPhrase}}. So excited to share this with everyone!",
            "Anyone else watching {{music.songName}} tonight? Can't wait!",
            "Thinking about {{commerce.productName}} - should I get one?",
            "I'm really enjoying {{lorem.paragraph}}",
            "Had an amazing time at {{location.city}} this weekend!",
            "Just learned about {{science.chemicalElement}}. Mind blown!",
            "{{hacker.phrase}} - This is what I've been working on lately.",
            "My thoughts on current events: {{lorem.sentences}}",
            "Grateful for {{lorem.sentence}}",
            "{{company.catchPhrase}} - my new motto!",
          ][Math.floor(Math.random() * 10)]
        ),
        imageUrl: null, // No images for posts
        authorId: userId,
        createdAt: faker.date.recent({ days: 30 }),
      });
    }
  }

  return await prisma.post.createMany({
    data: posts,
  });
};

const createComments = async (userIds, posts) => {
  console.log("Creating comments...");

  const comments = [];

  for (const post of posts) {
    const numComments = getRandomInt(
      MIN_COMMENTS_PER_POST,
      MAX_COMMENTS_PER_POST
    );
    const commenters = getRandomSubset(
      userIds.filter((id) => id !== post.authorId),
      0,
      numComments
    );

    for (let i = 0; i < commenters.length; i++) {
      comments.push({
        content: faker.helpers.fake(
          [
            "Totally agree with this!",
            "Great point, I hadn't thought of that.",
            "This is so true {{internet.emoji}}",
            "Can't believe it! {{internet.emoji}}",
            "Thanks for sharing this!",
            "I was just thinking about this yesterday.",
            "100% with you on this one.",
            "This made my day {{internet.emoji}}",
            "Interesting perspective!",
            "Love this content!",
          ][Math.floor(Math.random() * 10)]
        ),
        authorId: commenters[i],
        postId: post.id,
        createdAt: faker.date.between({ from: post.createdAt, to: new Date() }),
      });
    }
  }

  return await prisma.comment.createMany({
    data: comments,
  });
};

const createLikes = async (userIds, posts) => {
  console.log("Creating likes...");

  const likes = [];

  for (const post of posts) {
    const numLikes = getRandomInt(MIN_LIKES_PER_POST, MAX_LIKES_PER_POST);
    const likers = getRandomSubset(
      userIds.filter((id) => id !== post.authorId),
      0,
      numLikes
    );

    for (const likerId of likers) {
      likes.push({
        userId: likerId,
        postId: post.id,
      });
    }
  }

  // Use createMany with skipDuplicates to handle the unique constraint
  return await prisma.like.createMany({
    data: likes,
    skipDuplicates: true,
  });
};

const createFriendships = async (userIds) => {
  console.log("Creating friendships...");

  const friendships = [];

  for (const userId of userIds) {
    const numFriends = getRandomInt(MIN_FRIENDS_PER_USER, MAX_FRIENDS_PER_USER);
    const potentialFriends = userIds.filter((id) => id !== userId);
    const friends = getRandomSubset(potentialFriends, 0, numFriends);

    for (const friendId of friends) {
      // Avoid duplicate friendships (in both directions)
      const alreadyFriends = friendships.some(
        (f) =>
          (f.userId === userId && f.friendId === friendId) ||
          (f.userId === friendId && f.friendId === userId)
      );

      if (!alreadyFriends) {
        const status = getRandomFriendStatus();

        friendships.push({
          userId,
          friendId,
          status,
        });
      }
    }
  }

  return await prisma.friend.createMany({
    data: friendships,
  });
};

const createConversationsAndMessages = async (users, friendships) => {
  console.log("Creating conversations and messages...");

  // Get all accepted friendships
  const acceptedFriendships = friendships.filter(
    (f) => f.status === "ACCEPTED"
  );

  // Create direct conversations between friends
  for (const friendship of acceptedFriendships) {
    // Only create conversation with some probability
    if (Math.random() > CONVERSATION_PROBABILITY) continue;

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        createdAt: faker.date.recent({ days: 60 }),
        updatedAt: faker.date.recent({ days: 30 }),
      },
    });

    // Add participants
    await prisma.conversationParticipant.createMany({
      data: [
        {
          userId: friendship.userId,
          conversationId: conversation.id,
          joinedAt: conversation.createdAt,
          lastReadAt: faker.date.between({
            from: conversation.createdAt,
            to: new Date(),
          }),
        },
        {
          userId: friendship.friendId,
          conversationId: conversation.id,
          joinedAt: conversation.createdAt,
          lastReadAt: faker.date.between({
            from: conversation.createdAt,
            to: new Date(),
          }),
        },
      ],
    });

    // Create messages
    const numMessages = getRandomInt(
      MIN_MESSAGES_PER_CONVERSATION,
      MAX_MESSAGES_PER_CONVERSATION
    );
    const messages = [];

    let lastMessageDate = conversation.createdAt;

    for (let i = 0; i < numMessages; i++) {
      const sender =
        Math.random() < 0.5 ? friendship.userId : friendship.friendId;
      const receiver =
        sender === friendship.userId ? friendship.friendId : friendship.userId;

      // Generate a date after the previous message
      lastMessageDate = faker.date.between({
        from: lastMessageDate,
        to: new Date(),
      });

      messages.push({
        content: faker.helpers.fake(
          [
            "Hey, how are you doing?",
            "Did you see that new movie everyone's talking about?",
            "What are your plans this weekend?",
            "I just finished that book you recommended. It was amazing!",
            "Happy birthday! Hope you have a great day.",
            "Can we meet up for coffee sometime this week?",
            "Thanks for your help with that project.",
            "Have you tried that new restaurant downtown?",
            "Just wanted to check in and see how you're doing.",
            "Did you hear about the news? Crazy, right?",
            "I'm thinking of getting a new phone. Any recommendations?",
            "Remember that time we went to {{location.city}}? Good memories!",
            "Hey, could you send me that document when you get a chance?",
            "How did your interview go?",
            "I'm going to be in your area next week. Want to meet up?",
          ][Math.floor(Math.random() * 15)]
        ),
        senderId: sender,
        receiverId: receiver,
        conversationId: conversation.id,
        isRead: faker.helpers.maybe(() => true, { probability: 0.8 }),
        createdAt: lastMessageDate,
        updatedAt: lastMessageDate,
      });
    }

    await prisma.message.createMany({
      data: messages,
    });
  }

  // Create a few group conversations
  const numGroupConversations = Math.floor(users.length / 5);

  for (let i = 0; i < numGroupConversations; i++) {
    const groupSize = getRandomInt(3, 6);
    const participants = getRandomSubset(users, groupSize, groupSize);

    const groupNames = [
      "Weekend Plans",
      "Project Team",
      "Game Night",
      "Family Chat",
      "Vacation Planning",
      "Book Club",
      "Movie Lovers",
      "Coffee Meetup",
      "Tech Talk",
      "Fitness Group",
    ];

    const conversation = await prisma.conversation.create({
      data: {
        title: groupNames[Math.floor(Math.random() * groupNames.length)],
        isGroup: true,
        createdAt: faker.date.recent({ days: 60 }),
        updatedAt: faker.date.recent({ days: 30 }),
      },
    });

    // Add participants
    await prisma.conversationParticipant.createMany({
      data: participants.map((user) => ({
        userId: user.id,
        conversationId: conversation.id,
        joinedAt: faker.date.between({
          from: conversation.createdAt,
          to: new Date(),
        }),
        lastReadAt: faker.date.recent({ days: 7 }),
      })),
    });

    // Create messages
    const numMessages = getRandomInt(
      MIN_MESSAGES_PER_CONVERSATION,
      MAX_MESSAGES_PER_CONVERSATION
    );
    const messages = [];

    let lastMessageDate = conversation.createdAt;

    const groupMessageTemplates = [
      "Hey everyone!",
      "What time are we meeting?",
      "Can't make it today, sorry!",
      "Has anyone seen the latest update?",
      "Who's bringing the snacks?",
      "I'm running a bit late, start without me.",
      "Great meeting today, everyone!",
      "Here's the link to the document we discussed: [link]",
      "Don't forget about our deadline next week.",
      "Anyone free this weekend?",
      "Do we need to reschedule?",
      "I've shared some files with all of you.",
      "What does everyone think about the new changes?",
      "Let's finalize the plans by tomorrow.",
      "Welcome to the group, @newmember!",
    ];

    for (let j = 0; j < numMessages; j++) {
      const sender = participants[getRandomInt(0, participants.length - 1)];

      // Generate a date after the previous message
      lastMessageDate = faker.date.between({
        from: lastMessageDate,
        to: new Date(),
      });

      messages.push({
        content:
          groupMessageTemplates[
            Math.floor(Math.random() * groupMessageTemplates.length)
          ],
        senderId: sender.id,
        conversationId: conversation.id,
        isRead: faker.helpers.maybe(() => true, { probability: 0.7 }),
        createdAt: lastMessageDate,
        updatedAt: lastMessageDate,
      });
    }

    await prisma.message.createMany({
      data: messages,
    });
  }
};

const createNotifications = async (
  users,
  posts,
  comments,
  likes,
  friendships
) => {
  console.log("Creating notifications...");

  const notifications = [];

  // Post like notifications
  for (const like of likes) {
    const post = posts.find((p) => p.id === like.postId);

    if (post && post.authorId !== like.userId) {
      notifications.push({
        type: "LIKE",
        content: "liked your post",
        userId: post.authorId,
        fromUserId: like.userId,
        postId: like.postId,
        createdAt: faker.date.recent({ days: 14 }),
        isRead: faker.helpers.maybe(() => true, { probability: 0.6 }),
      });
    }
  }

  // Comment notifications
  for (const comment of comments) {
    const post = posts.find((p) => p.id === comment.postId);

    if (post && post.authorId !== comment.authorId) {
      notifications.push({
        type: "COMMENT",
        content: "commented on your post",
        userId: post.authorId,
        fromUserId: comment.authorId,
        postId: comment.postId,
        commentId: comment.id,
        createdAt: comment.createdAt,
        isRead: faker.helpers.maybe(() => true, { probability: 0.6 }),
      });
    }
  }

  // Friend request notifications
  for (const friendship of friendships) {
    if (friendship.status === "PENDING") {
      notifications.push({
        type: "FRIEND_REQUEST",
        content: "sent you a friend request",
        userId: friendship.friendId,
        fromUserId: friendship.userId,
        friendRequestId: friendship.id,
        createdAt: friendship.createdAt,
        isRead: faker.helpers.maybe(() => true, { probability: 0.4 }),
      });
    }
  }

  return await prisma.notification.createMany({
    data: notifications,
  });
};

const main = async () => {
  try {
    console.log("Starting to generate test data...");

    // Create users
    await createUsers();
    const users = await prisma.user.findMany();
    const userIds = users.map((user) => user.id);

    // Create posts
    await createPosts(userIds);
    const posts = await prisma.post.findMany({
      include: { author: true },
    });

    // Create comments
    await createComments(userIds, posts);
    const comments = await prisma.comment.findMany();

    // Create likes
    await createLikes(userIds, posts);
    const likes = await prisma.like.findMany();

    // Create friendships
    await createFriendships(userIds);
    const friendships = await prisma.friend.findMany();

    // Create conversations and messages
    await createConversationsAndMessages(users, friendships);

    // Create notifications
    await createNotifications(users, posts, comments, likes, friendships);

    console.log("Test data generation completed successfully!");

    // Output some stats
    console.log(`Created ${users.length} users`);
    console.log(`Created ${posts.length} posts`);
    console.log(`Created ${comments.length} comments`);
    console.log(`Created ${likes.length} likes`);
    console.log(`Created ${friendships.length} friendships`);

    const conversations = await prisma.conversation.count();
    console.log(`Created ${conversations} conversations`);

    const messages = await prisma.message.count();
    console.log(`Created ${messages} messages`);

    const notifications = await prisma.notification.count();
    console.log(`Created ${notifications} notifications`);
  } catch (error) {
    console.error("Error generating test data:", error);
  } finally {
    await prisma.$disconnect();
  }
};

main();
