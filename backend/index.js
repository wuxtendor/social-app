const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Import bcrypt
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const http = require('http');
const { Server } = require('socket.io');


const app = express();
const prisma = new PrismaClient();
const PORT = 5000;

// --- Create HTTP and Socket.IO Servers ---
// 2. Create an HTTP server from our Express app
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// --- In-memory store for online users ---
let onlineUsers = {};
const addUser = (userId, socketId) => { onlineUsers[userId] = socketId; };
const removeUser = (socketId) => {
  onlineUsers = Object.fromEntries(Object.entries(onlineUsers).filter(([, id]) => id !== socketId));
};
const getUserFromSocket = (socketId) => {
  return Object.keys(onlineUsers).find(userId => onlineUsers[userId] === socketId);
};

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  socket.on('addUser', (userId) => {
    addUser(userId, socket.id);
    io.emit('getUsers', Object.keys(onlineUsers)); // Send updated user list to all clients
  });

  socket.on('sendMessage', async ({ receiverId, content }) => {
    const senderId = parseInt(getUserFromSocket(socket.id), 10);
    if (!senderId) return;

    const newMessage = await prisma.message.create({
      data: { senderId, receiverId, content },
    });
    
    const receiverSocketId = onlineUsers[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('getMessage', newMessage);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    removeUser(socket.id);
    io.emit('getUsers', Object.keys(onlineUsers)); // Send updated user list to all clients
  });
});

app.use(cors());
app.use(express.json()); // <-- Middleware to parse JSON bodies

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // if there isn't any token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // if token is no longer valid
    req.user = user; // Attach user payload to the request object
    next(); // Move on to the next piece of middleware or the route handler
  });
}

// Create a new user (Registration)
app.post('/api/users', async (req, res) => {
  const { name, email, age, description, avatar, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

  try {
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        age,
        avatar: avatar || 'https://i.pravatar.cc/150', // Default avatar
        password: hashedPassword,
      },
    });
    // Never send the password back, even the hash
    delete newUser.password;
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'This email is already registered.' });
    }
    console.error("Failed to create user:", error);
    res.status(500).json({ error: "Could not create user" });
  }
});



// Add this new route
app.get('/api/users', async (req, res) => {
  try {
    // Use Prisma's 'findMany' to get all records from the User table
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// The new route with a dynamic parameter ':id'
app.get('/api/users/:id', async (req, res) => {
  // 1. Get the ID from the URL parameters and convert it to a number
  const userId = parseInt(req.params.id, 10);

  // Add a check to ensure the ID is a valid number
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    // 2. Use Prisma's 'findUnique' to get a specific user by their ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Failed to fetch user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body; // <-- Change 'name' to 'email'

  try {
    // Find the user by their unique email address
    const user = await prisma.user.findUnique({
      where: { email }, // <-- Change 'name' to 'email'
    });

    const isPasswordCorrect = user && (await bcrypt.compare(password, user.password) || user.password === password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email }, // Add email to token
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a user's profile
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const userIdToUpdate = parseInt(req.params.id, 10);

  if (req.user.userId !== userIdToUpdate) {
    return res.status(403).json({ error: "You can only edit your own profile." });
  }

  // 1. Добавим 'name' в список полей, которые мы принимаем из запроса
  const { name, description, avatar } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userIdToUpdate },
      // 2. Добавим 'name' в объект данных для обновления
      data: { name, description, avatar },
    });
    delete updatedUser.password;
    res.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user:", error);
    res.status(500).json({ error: "Could not update user" });
  }
});

// Check if an email already exists
app.post('/api/check-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // Respond with whether the user exists or not
    res.json({ exists: !!existingUser });

  } catch (error) {
    console.error("Email check error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get message history between two users (Protected)
// Add 'authenticateToken' right after the path string
app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  const currentUserId = req.user.userId;
  const otherUserId = parseInt(req.params.otherUserId, 10);
  try {
    // Ensure the variable 'prisma' is used here, not a typo like 'prasma'
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: currentUserId, receiverId: otherUserId }, { senderId: otherUserId, receiverId: currentUserId }] },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).json({ error: 'Could not fetch messages' });
  }
});
// --- FEED API ---

// Get a personalized feed for the logged-in user (Protected)
app.get('/api/feed', authenticateToken, async (req, res) => {
  const loggedInUserId = req.user.userId;

  try {
    // 1. Find all accepted friendships for the current user
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: loggedInUserId },
          { addresseeId: loggedInUserId },
        ],
      },
    });

    // 2. Extract the IDs of all friends
    const friendIds = friendships.map(f => 
      f.requesterId === loggedInUserId ? f.addresseeId : f.requesterId
    );

    // 3. Find all posts where the authorId is in our list of friendIds
    const feedPosts = await prisma.post.findMany({
      where: {
        authorId: {
          in: friendIds,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: { select: { name: true, avatar: true } },
        _count: { select: { likes: true } },
        likes: { where: { userId: loggedInUserId } },
      },
    });

    // 4. Process the posts just like we did for the profile page
    const processedFeed = feedPosts.map(post => ({
      ...post,
      isLikedByUser: post.likes.length > 0,
      likesCount: post._count.likes || 0,
    }));

    res.json(processedFeed);

  } catch (error) {
    console.error("Failed to fetch feed:", error);
    res.status(500).json({ error: 'Could not fetch feed' });
  }
});

// --- POSTS API ---

// Create a new post (Protected)
app.post('/api/posts', authenticateToken, async (req, res) => {
  const { content } = req.body;
  const authorId = req.user.userId; // Get user ID from the authenticated token

  if (!content) {
    return res.status(400).json({ error: 'Post content cannot be empty' });
  }

  try {
    const newPost = await prisma.post.create({
      data: {
        content,
        authorId, // Link the post to the logged-in user
      },
    });
    res.status(201).json(newPost);
  } catch (error) {
    console.error("Failed to create post:", error);
    res.status(500).json({ error: 'Could not create post' });
  }
});

// Get all posts for a specific user
// Get all posts for a specific user
app.get('/api/users/:id/posts', async (req, res) => {
  const userIdToView = parseInt(req.params.id, 10);
  let loggedInUserId = null;

  // Manually check for an authentication token instead of using middleware
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      loggedInUserId = decoded.userId;
    } catch (err) {
      // Invalid token, treat as a guest user
      console.log("Invalid token on post fetch, user treated as guest.");
    }
  }

  try {
    const posts = await prisma.post.findMany({
      where: { authorId: userIdToView },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, avatar: true } },
        _count: { select: { likes: true } },
        // Only include the 'likes' relation if a user is logged in
        ...(loggedInUserId && {
          likes: { where: { userId: loggedInUserId } },
        }),
      },
    });
    
    const processedPosts = posts.map(post => ({
      ...post,
      // If 'post.likes' exists (it only will for a logged-in user), its length will be 1 or 0.
      isLikedByUser: !!post.likes?.length,
      likesCount: post._count.likes || 0,
    }));

    res.json(processedPosts);
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    res.status(500).json({ error: 'Could not fetch posts' });
  }
});

// Toggle a like on a post (Protected)
app.post('/api/posts/:postId/like', authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.user.userId;

  try {
    // Check if the like already exists
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existingLike) {
      // If it exists, user is "unliking", so delete it
      await prisma.like.delete({ where: { id: existingLike.id } });
      res.json({ message: 'Post unliked' });
    } else {
      // If it doesn't exist, user is "liking", so create it
      await prisma.like.create({
        data: { postId, userId },
      });
      res.json({ message: 'Post liked' });
    }
  } catch (error) {
    console.error("Failed to toggle like:", error);
    res.status(500).json({ error: 'Could not process like' });
  }
});

// --- FRIENDSHIPS API ---

// Send a friend request (Protected)
app.post('/api/friend-requests', authenticateToken, async (req, res) => {
  const { addresseeId } = req.body;
  const requesterId = req.user.userId;

  if (requesterId === addresseeId) {
    return res.status(400).json({ error: "You cannot send a friend request to yourself." });
  }

  try {
    const newRequest = await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: 'PENDING',
      },
    });
    res.status(201).json(newRequest);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "A friend request already exists." });
    }
    console.error("Failed to send friend request:", error);
    res.status(500).json({ error: 'Could not send friend request' });
  }
});


// Get incoming friend requests for the logged-in user (Protected)
app.get('/api/friend-requests', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const requests = await prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'PENDING',
      },
      include: { // Include the requester's details
        requester: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
    res.json(requests);
  } catch (error) {
    console.error("Failed to fetch friend requests:", error);
    res.status(500).json({ error: 'Could not fetch friend requests' });
  }
});


// Accept or reject a friend request (Protected)
app.put('/api/friend-requests/:requestId', authenticateToken, async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body; // Expecting 'ACCEPTED' or 'REJECTED'
  const userId = req.user.userId;

  if (status !== 'ACCEPTED' && status !== 'REJECTED') {
    return res.status(400).json({ error: "Invalid status." });
  }

  try {
    const request = await prisma.friendship.findUnique({
      where: { id: parseInt(requestId, 10) },
    });

    // Ensure the logged-in user is the one who received the request
    if (!request || request.addresseeId !== userId) {
      return res.status(403).json({ error: "You are not authorized to update this request." });
    }

    if (status === 'ACCEPTED') {
      const updatedRequest = await prisma.friendship.update({
        where: { id: parseInt(requestId, 10) },
        data: { status: 'ACCEPTED' },
      });
      res.json(updatedRequest);
    } else { // status === 'REJECTED'
      await prisma.friendship.delete({
        where: { id: parseInt(requestId, 10) },
      });
      res.status(204).send(); // 204 No Content
    }
  } catch (error) {
    console.error("Failed to update friend request:", error);
    res.status(500).json({ error: 'Could not update friend request' });
  }
});

// Get the friendship status between the logged-in user and another user
app.get('/api/friendship-status/:otherUserId', authenticateToken, async (req, res) => {
  const currentUserId = req.user.userId;
  const otherUserId = parseInt(req.params.otherUserId, 10);

  try {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: currentUserId },
        ],
      },
    });

    if (!friendship) {
      return res.json({ status: 'NOT_FRIENDS' });
    }

    res.json(friendship);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a user's accepted friends list
app.get('/api/friends', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, avatar: true } },
        addressee: { select: { id: true, name: true, avatar: true } },
      },
    });
    // Map the data to return a clean list of friends, not the friendship object
    const friends = friendships.map(f => f.requesterId === userId ? f.addressee : f.requester);
    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch friends' });
  }
});

// Get outgoing (sent) friend requests for the logged-in user
app.get('/api/friend-requests/sent', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const sentRequests = await prisma.friendship.findMany({
      where: {
        requesterId: userId,
        status: 'PENDING',
      },
      include: {
        addressee: { select: { id: true, name: true, avatar: true } },
      },
    });
    res.json(sentRequests);
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch sent requests' });
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server with Socket.IO successfully started on port ${PORT}`);
});