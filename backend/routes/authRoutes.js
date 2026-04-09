const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Signup Route
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Determine role based on email
    const isAdminEmail = email === 'admin@sru.edu.in' || email.endsWith('@sru.edu.in');

    user = new User({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: isAdminEmail ? 'admin' : 'learner'
    });

    await user.save();

    // Generate JWT token for immediate login
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      msg: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ msg: 'Server error during registration' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for hardcoded admin login first
    if (email === 'admin@sru.edu.in' && password === 'admin123') {
      // Try to find existing admin user first
      let adminUser = await User.findOne({ email: 'admin@sru.edu.in' });

      if (!adminUser) {
        // Create admin user if doesn't exist
        adminUser = new User({
          name: 'Admin',
          email: 'admin@sru.edu.in',
          password: 'admin123', // This will be hashed by the pre-save middleware
          role: 'admin'
        });
        await adminUser.save();
      }

      const payload = { user: { id: adminUser._id } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      return res.json({ token });
    }

    // Try to find user in database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get User Data
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: 'Invalid token' });
  }
});

// Update User Profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, email } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: decoded.user.id } });
      if (existingUser) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
    }

    const user = await User.findByIdAndUpdate(
      decoded.user.id,
      { name, email },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get All Users (Admin only)
router.get('/users', async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user is admin
    const currentUser = await User.findById(decoded.user.id);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;