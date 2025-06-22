
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, default: 'user' },
  bio: String,
  avatar: String,
  ghost: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
