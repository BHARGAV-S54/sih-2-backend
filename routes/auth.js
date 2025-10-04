const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');

    const user = new User({ fullName, email, username, passwordHash, verificationToken: token });
    await user.save();

    // Send verification email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
    });

    await transporter.sendMail({
      to: email,
      subject: 'Verify your AquaScope account',
      html: `<a href="${process.env.BASE_URL}/api/auth/verify/${token}">Click to verify</a>`
    });

    res.json({ message: 'Registration successful, check your email to verify.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify
router.get('/verify/:token', async (req, res) => {
  const user = await User.findOne({ verificationToken: req.params.token });
  if (!user) return res.status(400).send('Invalid token');

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  res.send('Email verified! You can now log in.');
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'User not found' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: 'Invalid password' });
  if (!user.isVerified) return res.status(400).json({ error: 'Please verify your email first' });

  res.json({ message: 'Login successful' });
});

module.exports = router;
