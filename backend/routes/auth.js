import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import nodemailer from 'nodemailer';

const router = express.Router();

const transporterEllijay = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ELLIJAY_GMAIL_USER,
    pass: process.env.ELLIJAY_GMAIL_PASS
  }
});

const transporterDemorest = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.DEMOREST_GMAIL_USER,
    pass: process.env.DEMOREST_GMAIL_PASS
  }
});

router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existingUser = await query(
      'SELECT id FROM customers WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const verificationToken = uuidv4();

    const result = await query(
      `INSERT INTO customers (first_name, last_name, email, phone, username, password_hash, verification_token, email_verified, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, email, first_name`,
      [first_name, last_name, email, phone || null, email, hashedPassword, verificationToken, false, 'self_signup']
    );

    const customerId = result.rows[0].id;

    const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}&customerId=${customerId}`;
    const emailBody = `Hi ${first_name},\n\nThank you for registering. Click the link below to verify your email address:\n\n${verificationLink}\n\nThis link expires in 24 hours.\n\nIf you did not create this account, please ignore this email.`;

    await sendVerificationEmail(email, 'Verify Your Email Address', emailBody);

    res.json({
      message: 'Registration successful. Check your email to verify your account.',
      customerId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { token, customerId } = req.body;

    if (!token || !customerId) {
      return res.status(400).json({ error: 'Token and customer ID required' });
    }

    const customerResult = await query(
      'SELECT id, verification_token FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    if (customer.verification_token !== token) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    await query(
      'UPDATE customers SET email_verified = true, verification_token = null WHERE id = $1',
      [customerId]
    );

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await query(
      'SELECT id, email, password_hash, first_name, email_verified FROM customers WHERE email = $1 LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.email_verified) {
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }

    const passwordMatch = await bcryptjs.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        userId: user.id,
        email: user.email,
        name: user.first_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

async function sendVerificationEmail(to, subject, body) {
  try {
    const transporter = transporterEllijay;
    await transporter.sendMail({
      from: process.env.ELLIJAY_GMAIL_USER,
      to,
      subject,
      text: body
    });
    console.log(`Verification email sent to ${to}`);
  } catch (error) {
    console.error('Verification email error:', error);
  }
}

export default router;
