import bcryptjs from 'bcryptjs';
import { query } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedAdmin() {
  try {
    const email = 'admin@storage.com';
    const password = 'password123';
    const firstName = 'Admin';
    const lastName = 'User';

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM customers WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create the admin user
    const result = await query(
      `INSERT INTO customers (first_name, last_name, email, username, password_hash, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name`,
      [firstName, lastName, email, email, hashedPassword, 'manual_entry']
    );

    console.log('Admin user created successfully!');
    console.log('Email:', result.rows[0].email);
    console.log('Password: password123');
    console.log('Use these credentials to log in to the dashboard at http://localhost:3000');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
