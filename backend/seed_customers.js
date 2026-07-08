import bcryptjs from 'bcryptjs';
import { query } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedCustomers() {
  try {
    console.log('Creating test customers with rentals...');

    const customers = [
      { first_name: 'John', last_name: 'Smith', email: 'john@example.com', password: 'password123' },
      { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', password: 'password123' },
      { first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com', password: 'password123' }
    ];

    const facilitiesResult = await query('SELECT id, name FROM facilities');
    const unitsResult = await query('SELECT id, facility_id FROM units WHERE status = $1 LIMIT 3', ['available']);

    for (let i = 0; i < customers.length && i < unitsResult.rows.length; i++) {
      const customer = customers[i];
      const unit = unitsResult.rows[i];

      const hashedPassword = await bcryptjs.hash(customer.password, 10);

      const customerResult = await query(
        `INSERT INTO customers (first_name, last_name, email, username, password_hash, source)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [customer.first_name, customer.last_name, customer.email, customer.email, hashedPassword, 'manual_entry']
      );

      const customerId = customerResult.rows[0].id;
      const facilityId = unit.facility_id;

      const unitDetailsResult = await query('SELECT monthly_rate, unit_type_id FROM units WHERE id = $1', [unit.id]);
      const monthlyRate = unitDetailsResult.rows[0].monthly_rate;

      const today = new Date();
      const rentalResult = await query(
        `INSERT INTO rentals (facility_id, unit_id, customer_id, start_date, monthly_rate, late_fee, status, lease_signed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [facilityId, unit.id, customerId, today, monthlyRate, 15.00, 'active', true]
      );

      const rentalId = rentalResult.rows[0].id;

      const dueDateDay = 1;
      const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDateDay);

      await query(
        `INSERT INTO invoices (rental_id, customer_id, facility_id, period_start, period_end, due_date, subtotal, total_amount, balance, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [rentalId, customerId, facilityId, today, new Date(today.getFullYear(), today.getMonth() + 1, 0), dueDate, monthlyRate, monthlyRate, monthlyRate, 'unpaid']
      );

      await query('UPDATE units SET current_tenant_id = $1, status = $2 WHERE id = $3', [customerId, 'rented', unit.id]);

      console.log(`Created customer: ${customer.email}`);
    }

    console.log('\nTest customers created successfully!');
    console.log('You can log in with:');
    console.log('  Email: john@example.com');
    console.log('  Password: password123');
    console.log('\nOr:');
    console.log('  Email: jane@example.com');
    console.log('  Password: password123');
    console.log('\nOr:');
    console.log('  Email: bob@example.com');
    console.log('  Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('Error creating customers:', error);
    process.exit(1);
  }
}

seedCustomers();
