import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/facilities', async (req, res) => {
  try {
    const result = await query('SELECT * FROM facilities ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

router.get('/facilities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM facilities WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching facility:', error);
    res.status(500).json({ error: 'Failed to fetch facility' });
  }
});

router.get('/facilities/:facilityId/units', async (req, res) => {
  try {
    const { facilityId } = req.params;
    
    const result = await query(`
      SELECT u.*, c.first_name, c.last_name, c.email, c.phone
      FROM units u
      LEFT JOIN customers c ON u.current_tenant_id = c.id
      WHERE u.facility_id = $1
      ORDER BY u.unit_number
    `, [facilityId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

router.get('/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT u.*, c.first_name, c.last_name, c.email, c.phone
      FROM units u
      LEFT JOIN customers c ON u.current_tenant_id = c.id
      WHERE u.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({ error: 'Failed to fetch unit' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, first_name, last_name, email, phone, account_balance, is_locked_out, created_at
      FROM customers
      ORDER BY last_name, first_name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const customerResult = await query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const customer = customerResult.rows[0];
    
    const rentalsResult = await query(`
      SELECT r.*, u.unit_number, f.name as facility_name, ut.name as unit_type
      FROM rentals r
      JOIN units u ON r.unit_id = u.id
      JOIN facilities f ON r.facility_id = f.id
      JOIN unit_types ut ON u.unit_type_id = ut.id
      WHERE r.customer_id = $1
      ORDER BY r.start_date DESC
    `, [id]);
    
    const invoicesResult = await query(`
      SELECT * FROM invoices
      WHERE customer_id = $1
      ORDER BY due_date DESC
    `, [id]);
    
    res.json({
      customer,
      rentals: rentalsResult.rows,
      invoices: invoicesResult.rows
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const { status, facilityId } = req.query;
    
    let sql = `
      SELECT i.*, c.first_name, c.last_name, c.email, u.unit_number, f.name as facility_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN rentals r ON i.rental_id = r.id
      JOIN units u ON r.unit_id = u.id
      JOIN facilities f ON i.facility_id = f.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      sql += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }
    
    if (facilityId) {
      sql += ` AND i.facility_id = $${params.length + 1}`;
      params.push(facilityId);
    }
    
    sql += ` ORDER BY i.due_date DESC`;
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.get('/reports/past-due', async (req, res) => {
  try {
    const result = await query(`
      SELECT i.*, c.first_name, c.last_name, c.email, u.unit_number, f.name as facility_name,
             EXTRACT(DAY FROM now() - i.due_date) as days_overdue
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN rentals r ON i.rental_id = r.id
      JOIN units u ON r.unit_id = u.id
      JOIN facilities f ON i.facility_id = f.id
      WHERE i.status IN ('past_due_10', 'past_due_30', 'locked_out')
      ORDER BY days_overdue DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching past due report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

router.get('/waiting-list', async (req, res) => {
  try {
    const result = await query(`
      SELECT wl.*, c.first_name, c.last_name, c.email, c.phone, f.name as facility_name
      FROM waiting_list wl
      JOIN customers c ON wl.customer_id = c.id
      JOIN facilities f ON wl.facility_id = f.id
      WHERE wl.status = 'waiting'
      ORDER BY wl.date_added
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching waiting list:', error);
    res.status(500).json({ error: 'Failed to fetch waiting list' });
  }
});

export default router;
