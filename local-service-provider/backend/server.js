// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://tejaswinikothakotladb:tejaswini123@cluster0.wys2cto.mongodb.net/worker-hiring-system?appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

// Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'worker'], required: true },
  phone: String,
  address: String,
  skills: [String], // For workers
  createdAt: { type: Date, default: Date.now }
});

const RequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  location: String,
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Request = mongoose.model('Request', RequestSchema);

// Socket.io connection management
const connectedUsers = new Map(); // Map of userId to socketId

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('register', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    // Remove user from connected users
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, address, skills } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      name,
      email,
      password, // In production, hash this password
      role,
      phone,
      address,
      skills: role === 'worker' ? skills : []
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully', userId: user._id, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({ 
      message: 'Login successful', 
      userId: user._id, 
      role: user.role,
      name: user.name 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all workers
app.get('/api/workers', async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password');
    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user details
app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send work request
app.post('/api/requests', async (req, res) => {
  try {
    const { userId, workerId, description, location } = req.body;

    const request = new Request({
      userId,
      workerId,
      description,
      location
    });

    await request.save();
    
    // Populate user details for notification
    const populatedRequest = await Request.findById(request._id).populate('userId', 'name email phone');

    // Send real-time notification to worker
    const workerSocketId = connectedUsers.get(workerId);
    if (workerSocketId) {
      io.to(workerSocketId).emit('newRequest', populatedRequest);
    }

    res.status(201).json({ message: 'Request sent successfully', request: populatedRequest });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get requests for worker
app.get('/api/requests/worker/:workerId', async (req, res) => {
  try {
    const requests = await Request.find({ workerId: req.params.workerId })
      .populate('userId', 'name email phone address')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get requests for user
app.get('/api/requests/user/:userId', async (req, res) => {
  try {
    const requests = await Request.find({ userId: req.params.userId })
      .populate('workerId', 'name email phone skills')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update request status
app.patch('/api/requests/:requestId', async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.requestId,
      { status },
      { new: true }
    ).populate('userId', 'name email phone');

    // Notify user about status change
    const userSocketId = connectedUsers.get(request.userId._id.toString());
    if (userSocketId) {
      io.to(userSocketId).emit('requestStatusUpdate', request);
    }

    res.json({ message: 'Request updated successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));