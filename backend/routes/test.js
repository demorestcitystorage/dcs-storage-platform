import express from 'express';
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

router.get('/email/ellijay', async (req, res) => {
  try {
    await transporterEllijay.sendMail({
      from: process.env.ELLIJAY_GMAIL_USER,
      to: 'jjenkins3418@gmail.com',
      subject: 'Test Email from Ellijay Storage',
      text: 'If you received this, Ellijay email is working!'
    });
    res.json({ message: 'Test email sent from Ellijay' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/email/demorest', async (req, res) => {
  try {
    await transporterDemorest.sendMail({
      from: process.env.DEMOREST_GMAIL_USER,
      to: 'jjenkins3418@gmail.com',
      subject: 'Test Email from Demorest City Storage',
      text: 'If you received this, Demorest email is working!'
    });
    res.json({ message: 'Test email sent from Demorest' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
