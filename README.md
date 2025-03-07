# Facebook Clone API

A full-featured social media platform backend with real-time capabilities, including authentication, social features, messaging, and notifications.

## Features

### Authentication System

- User registration and login with JWT
- Guest user access
- Online status tracking
- Gravatar integration for profile pictures

### Social Features

- Posts, comments, and likes
- Friend requests and connections
- User profiles with customizable details

### Messaging System

- Real-time conversations (group and direct)
- Read receipts
- Message editing and deletion

### Notification System

- Database-persisted notifications
- Real-time delivery via Socket.IO
- Notifications for all social interactions

### Real-time Communication

- Socket.IO integration
- User presence tracking
- Event broadcasting

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time Communication**: Socket.IO
- **Others**: bcrypt for password hashing, Gravatar for avatars
