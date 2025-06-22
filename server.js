
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" }
});

const onlineUsers = {};

io.on('connection', (socket) => {
  socket.on('register', async ({ username, password }) => {
    let user = await User.findOne({ username });

    if (!user) {
      user = new User({ username, password, role: 'user' });
      await user.save();
    }

    onlineUsers[socket.id] = user;
    io.emit('user list', Object.values(onlineUsers).map(u => u.username));
    socket.emit('role', user.role);
  });

  socket.on('chat message', async (msg) => {
    const user = onlineUsers[socket.id];
    if (!user) return;
    const message = new Message({ username: user.username, content: msg });
    await message.save();
    io.emit('chat message', { user, msg });
  });

  socket.on('private message', async ({ to, msg }) => {
    const sender = onlineUsers[socket.id];
    if (!sender) return;

    const targetSocketId = Object.keys(onlineUsers).find(id => onlineUsers[id].username === to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('private message', { from: sender.username, msg });
    }
  });

  socket.on('quote message', ({ quote }) => {
    const user = onlineUsers[socket.id];
    if (user) io.emit('quote message', { user, quote });
  });

  socket.on('admin action', async ({ action, target }) => {
    const user = onlineUsers[socket.id];
    if (user?.role === 'admin') {
      io.emit('admin action', { action, target, by: user.username });
    }
  });

  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('user list', Object.values(onlineUsers).map(u => u.username));
  });
});

server.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});
