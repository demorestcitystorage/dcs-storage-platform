import { query } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedData() {
  try {
    console.log('Creating facilities...');

    // Create Ellijay facility
    const ellijayResult = await query(
      `INSERT INTO facilities (name, slug, address, city, state, zip, phone, email, website, 
                               primary_color, secondary_color, accent_color, 
                               billing_due_day, grace_period_days, late_fee_day, late_fee_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id`,
      ['Ellijay Storage', 'ellijay', '5100 Yukon Rd', 'Ellijay', 'GA', '30540', 
       '(706) 768-4220', 'ellijaystorage@gmail.com', 'https://ellijaystoragega.com',
       '#2d5016', '#666666', '#1a1a1a', 1, 4, 20, 15.00]
    );
    const ellijayId = ellijayResult.rows[0].id;
    console.log('Created Ellijay facility');

    // Create Demorest facility
    const demorestResult = await query(
      `INSERT INTO facilities (name, slug, address, city, state, zip, phone, email, website,
                               primary_color, secondary_color, accent_color,
                               billing_due_day, grace_period_days, late_fee_day, late_fee_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id`,
      ['Demorest City Storage', 'demorest', '123 Main St', 'Demorest', 'GA', '30535',
       '(706) 123-4567', 'demorest@gmail.com', 'https://demorestcitystorage.com',
       '#2d5016', '#666666', '#1a1a1a', 1, 4, 20, 15.00]
    );
    const demorestId = demorestResult.rows[0].id;
    console.log('Created Demorest facility');

    // Create unit types for Ellijay
    const types10x10 = await query(
      'INSERT INTO unit_types (facility_id, name, width, depth, height) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [ellijayId, '10x10', 10, 10, 8]
    );
    const types10x20 = await query(
      'INSERT INTO unit_types (facility_id, name, width, depth, height) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [ellijayId, '10x20', 10, 20, 8]
    );

    // Create unit types for Demorest
    await query(
      'INSERT INTO unit_types (facility_id, name, width, depth, height) VALUES ($1, $2, $3, $4, $5)',
      [demorestId, '10x10', 10, 10, 8]
    );
    await query(
      'INSERT INTO unit_types (facility_id, name, width, depth, height) VALUES ($1, $2, $3, $4, $5)',
      [demorestId, '10x20', 10, 20, 8]
    );

    console.log('Created unit types');

    // Create units for Ellijay
    for (let i = 1; i <= 20; i++) {
      const unitType = i % 2 === 0 ? types10x20.rows[0].id : types10x10.rows[0].id;
      const rate = i % 2 === 0 ? 105 : 75;
      const status = i % 3 === 0 ? 'locked_out' : i % 4 === 0 ? 'available' : 'rented';
      
      await query(
        `INSERT INTO units (facility_id, unit_type_id, unit_number, monthly_rate, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [ellijayId, unitType, String(i), rate, status]
      );
    }
    console.log('Created 20 units for Ellijay');

    // Create units for Demorest
    for (let i = 1; i <= 15; i++) {
      const unitType = i % 2 === 0 ? types10x20.rows[0].id : types10x10.rows[0].id;
      const rate = i % 2 === 0 ? 105 : 75;
      const status = i % 3 === 0 ? 'available' : 'rented';
      
      await query(
        `INSERT INTO units (facility_id, unit_type_id, unit_number, monthly_rate, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [demorestId, unitType, String(i), rate, status]
      );
    }
    console.log('Created 15 units for Demorest');

    console.log('\nTest data created successfully!');
    console.log('Go to http://localhost:3000/dashboard to see the site map');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
