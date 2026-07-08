import schedule from 'node-schedule';
import { query } from '../database.js';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
 
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
 
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
 
export async function initializeBillingJobs() {
  console.log('Initializing billing automation jobs...');
 
  schedule.scheduleJob('0 2 1 * *', createMonthlyInvoices);
  schedule.scheduleJob('0 6 5 * *', sendLateNotice5Days);
  schedule.scheduleJob('0 6 10 * *', sendLateNotice10Days);
  schedule.scheduleJob('0 6 14 * *', sendFinalWarning);
  schedule.scheduleJob('0 6 20 * *', applyLockoutAndFees);
  schedule.scheduleJob('0 9 * * 1', sendWeeklyLockoutReminders);
 
  console.log('Billing jobs scheduled');
}
 
async function createMonthlyInvoices() {
  console.log('Creating monthly invoices...');
  try {
    const rentals = await query(`
      SELECT r.id, r.customer_id, r.facility_id, r.monthly_rate, r.late_fee
      FROM rentals r
      WHERE r.status = 'active'
    `);
 
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
 
    for (const rental of rentals.rows) {
      await query(`
        INSERT INTO invoices (rental_id, customer_id, facility_id, period_start, period_end, due_date, subtotal, total_amount, balance, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        rental.id,
        rental.customer_id,
        rental.facility_id,
        today,
        nextMonth,
        dueDate,
        rental.monthly_rate,
        rental.monthly_rate,
        rental.monthly_rate,
        'unpaid'
      ]);
 
      await logAutomation('invoice_created', rental.customer_id, rental.facility_id, null, rental.id, 'success');
    }
 
    console.log(`Created ${rentals.rows.length} invoices`);
  } catch (error) {
    console.error('Error creating invoices:', error);
  }
}
 
async function sendLateNotice5Days() {
  console.log('Sending 5-day late notices...');
  try {
    const overdue = await query(`
      SELECT i.id, c.id as customer_id, c.email, c.phone, c.first_name, f.id as facility_id
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN facilities f ON i.facility_id = f.id
      WHERE i.status = 'unpaid'
        AND i.due_date = CURRENT_DATE - INTERVAL '5 days'
        AND c.email_notifications_enabled = true
    `);
 
    for (const row of overdue.rows) {
      const subject = 'Payment is Now Late - Action Required';
      const body = `Hi ${row.first_name},\n\nYour storage unit rental payment is now 5 days late. Please pay immediately to avoid late fees and access restrictions.\n\nPay online: http://localhost:3000/customer-login`;
 
      await sendEmail(row.email, subject, body, row.facility_id);
      if (row.phone) {
        await sendSMS(row.phone, `Your storage payment is 5 days late. Pay now to avoid fees and lockout.`);
      }
 
      await logAutomation('late_notice_5days', row.customer_id, row.facility_id, row.id, null, 'success');
    }
 
    console.log(`Sent ${overdue.rows.length} 5-day late notices`);
  } catch (error) {
    console.error('Error sending late notices:', error);
  }
}
 
async function sendLateNotice10Days() {
  console.log('Sending 10-day late notices...');
  try {
    const overdue = await query(`
      SELECT i.id, c.id as customer_id, c.email, c.phone, c.first_name, f.id as facility_id
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN facilities f ON i.facility_id = f.id
      WHERE i.status = 'unpaid'
        AND i.due_date = CURRENT_DATE - INTERVAL '10 days'
        AND c.email_notifications_enabled = true
    `);
 
    for (const row of overdue.rows) {
      const subject = 'URGENT: Payment 10 Days Late - Lockout Coming Soon';
      const body = `Hi ${row.first_name},\n\nYour payment is now 10 days overdue. Late fees will be applied and your unit will be locked on the 20th unless you pay immediately.\n\nPay now: http://localhost:3000/customer-login`;
 
      await sendEmail(row.email, subject, body, row.facility_id);
      if (row.phone) {
        await sendSMS(row.phone, `URGENT: Your payment is 10 days late. Lockout and fees coming on the 20th. Pay now.`);
      }
 
      await logAutomation('late_notice_10days', row.customer_id, row.facility_id, row.id, null, 'success');
    }
 
    console.log(`Sent ${overdue.rows.length} 10-day late notices`);
  } catch (error) {
    console.error('Error sending late notices:', error);
  }
}
 
async function sendFinalWarning() {
  console.log('Sending final warnings before lockout...');
  try {
    const overdue = await query(`
      SELECT i.id, c.id as customer_id, c.email, c.phone, c.first_name, f.id as facility_id
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN facilities f ON i.facility_id = f.id
      WHERE i.status = 'unpaid'
        AND i.due_date = CURRENT_DATE - INTERVAL '14 days'
        AND c.email_notifications_enabled = true
    `);
 
    for (const row of overdue.rows) {
      const subject = 'FINAL WARNING: Your Unit Will Be Locked Tomorrow';
      const body = `Hi ${row.first_name},\n\nThis is your final warning. Your unit will be locked and access restricted tomorrow.\n\nPay immediately: http://localhost:3000/customer-login`;
 
      await sendEmail(row.email, subject, body, row.facility_id);
      if (row.phone) {
        await sendSMS(row.phone, `FINAL WARNING: Your unit locks TOMORROW. Pay now or lose access.`);
      }
 
      await logAutomation('final_warning', row.customer_id, row.facility_id, row.id, null, 'success');
    }
 
    console.log(`Sent ${overdue.rows.length} final warnings`);
  } catch (error) {
    console.error('Error sending warnings:', error);
  }
}
 
async function applyLockoutAndFees() {
  console.log('Applying lockout and late fees...');
  try {
    const unpaid = await query(`
      SELECT i.id, c.id as customer_id, c.email, c.phone, c.first_name, r.unit_id, f.id as facility_id
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN rentals r ON i.rental_id = r.id
      JOIN facilities f ON i.facility_id = f.id
      WHERE i.status = 'unpaid'
        AND i.due_date <= CURRENT_DATE - INTERVAL '20 days'
        AND i.lockout_applied = false
    `);
 
    for (const row of unpaid.rows) {
      await query(`
        UPDATE invoices
        SET status = 'locked_out',
            late_fee = $1,
            total_amount = subtotal + $1,
            balance = subtotal + $1,
            lockout_applied = true,
            lockout_applied_date = CURRENT_DATE
        WHERE id = $2
      `, [15.00, row.id]);
 
      await query(`
        UPDATE units
        SET status = 'locked_out'
        WHERE id = $1
      `, [row.unit_id]);
 
      await query(`
        UPDATE customers
        SET is_locked_out = true,
            lockout_reason = 'past_due'
        WHERE id = $1
      `, [row.customer_id]);
 
      const subject = 'NOTICE: Your Unit Access Has Been Restricted';
      const body = `Hi ${row.first_name},\n\nYour unit has been locked due to nonpayment. A $15 late fee has been added to your account.\n\nRestore access by paying your full balance: http://localhost:3000/customer-login`;
 
      await sendEmail(row.email, subject, body, row.facility_id);
      if (row.phone) {
        await sendSMS(row.phone, `Your unit access has been restricted due to nonpayment. Restore access by paying online.`);
      }
 
      await logAutomation('lockout_applied', row.customer_id, row.facility_id, row.id, null, 'success');
    }
 
    console.log(`Applied lockout to ${unpaid.rows.length} units`);
  } catch (error) {
    console.error('Error applying lockout:', error);
  }
}
 
async function sendWeeklyLockoutReminders() {
  console.log('Sending weekly lockout reminders...');
  try {
    const locked = await query(`
      SELECT i.id, c.id as customer_id, c.email, c.phone, c.first_name, c.is_locked_out, i.balance, f.id as facility_id
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN facilities f ON i.facility_id = f.id
      WHERE i.status = 'locked_out'
        AND c.is_locked_out = true
        AND c.email_notifications_enabled = true
    `);
 
    for (const row of locked.rows) {
      const subject = 'Your Unit Remains Locked - Pay to Restore Access';
      const body = `Hi ${row.first_name},\n\nYour unit access is still restricted. Amount owed: $${row.balance.toFixed(2)}\n\nRestore access now: http://localhost:3000/customer-login`;
 
      await sendEmail(row.email, subject, body, row.facility_id);
      if (row.phone) {
        await sendSMS(row.phone, `Your unit is locked. Amount owed: $${row.balance.toFixed(2)}. Pay to restore access.`);
      }
 
      await logAutomation('lockout_reminder_weekly', row.customer_id, row.facility_id, row.id, null, 'success');
    }
 
    console.log(`Sent ${locked.rows.length} weekly lockout reminders`);
  } catch (error) {
    console.error('Error sending reminders:', error);
  }
}
 
async function sendEmail(to, subject, body, facilityId) {
  try {
    const facilityResult = await query('SELECT slug FROM facilities WHERE id = $1', [facilityId]);
    
    if (facilityResult.rows.length === 0) {
      console.error(`Facility not found: ${facilityId}`);
      return;
    }
 
    const slug = facilityResult.rows[0].slug;
    const transporter = slug === 'ellijay' ? transporterEllijay : transporterDemorest;
    const fromEmail = slug === 'ellijay' ? process.env.ELLIJAY_GMAIL_USER : process.env.DEMOREST_GMAIL_USER;
 
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text: body
    });
 
    console.log(`Email sent to ${to} from ${fromEmail}`);
  } catch (error) {
    console.error('Email send error:', error);
  }
}
 
async function sendSMS(phone, message) {
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    console.log(`SMS sent to ${phone}`);
  } catch (error) {
    console.error('SMS send error:', error);
  }
}
 
async function logAutomation(actionType, customerId, facilityId, invoiceId, rentalId, status) {
  try {
    await query(`
      INSERT INTO automation_log (action_type, customer_id, facility_id, invoice_id, rental_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [actionType, customerId, facilityId, invoiceId, rentalId, status]);
  } catch (error) {
    console.error('Error logging automation:', error);
  }
}