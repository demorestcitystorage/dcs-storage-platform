import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.use(authenticateToken);

router.get('/rental/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const rentalResult = await query(`
      SELECT r.*, u.unit_number, f.name as facility_name
      FROM rentals r
      JOIN units u ON r.unit_id = u.id
      JOIN facilities f ON r.facility_id = f.id
      WHERE r.customer_id = $1 AND r.status = 'active'
      LIMIT 1
    `, [customerId]);

    const invoicesResult = await query(`
      SELECT * FROM invoices
      WHERE customer_id = $1
      ORDER BY due_date DESC
    `, [customerId]);

    if (rentalResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active rental found' });
    }

    res.json({
      rental: rentalResult.rows[0],
      invoices: invoicesResult.rows
    });
  } catch (error) {
    console.error('Error fetching rental:', error);
    res.status(500).json({ error: 'Failed to fetch rental' });
  }
});

router.post('/pay', async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;
    const customerId = req.user.userId;

    if (!invoiceId || !amount) {
      return res.status(400).json({ error: 'Invoice ID and amount required' });
    }

    const invoiceResult = await query(
      'SELECT * FROM invoices WHERE id = $1 AND customer_id = $2',
      [invoiceId, customerId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    if (amount > invoice.balance) {
      return res.status(400).json({ error: 'Payment exceeds balance owed' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      description: `Storage unit payment - Invoice ${invoice.id}`
    });

    const paymentResult = await query(
      `INSERT INTO payments (invoice_id, customer_id, amount, payment_method, stripe_payment_intent_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [invoiceId, customerId, amount, 'stripe_card', paymentIntent.id, 'pending']
    );

    res.json({
      paymentId: paymentResult.rows[0].id,
      clientSecret: paymentIntent.client_secret,
      amount
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Payment failed' });
  }
});

router.post('/pay/confirm', async (req, res) => {
  try {
    const { paymentId, paymentIntentId } = req.body;
    const customerId = req.user.userId;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const paymentResult = await query(
      `UPDATE payments 
       SET status = 'completed', stripe_charge_id = $1, updated_at = NOW()
       WHERE id = $2 AND customer_id = $3
       RETURNING invoice_id, amount`,
      [paymentIntent.charges.data[0].id, paymentId, customerId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const { invoice_id, amount } = paymentResult.rows[0];

    await query(
      `UPDATE invoices 
       SET amount_paid = amount_paid + $1,
           balance = balance - $1,
           status = CASE WHEN (balance - $1) <= 0 THEN 'paid' ELSE status END,
           updated_at = NOW()
       WHERE id = $2`,
      [amount, invoice_id]
    );

    res.json({ message: 'Payment confirmed successfully' });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
});

export default router;
