-- DCS Storage Platform - Database Schema
-- PostgreSQL initialization script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  logo_url TEXT,
  primary_color VARCHAR(7) NOT NULL DEFAULT '#2d5016',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#666666',
  accent_color VARCHAR(7) NOT NULL DEFAULT '#1a1a1a',
  billing_due_day INTEGER NOT NULL DEFAULT 1,
  grace_period_days INTEGER NOT NULL DEFAULT 4,
  late_fee_day INTEGER NOT NULL DEFAULT 20,
  late_fee_amount DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  street_address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  drivers_license_number VARCHAR(50),
  drivers_license_state VARCHAR(2),
  ssn_last_four VARCHAR(4),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  account_balance DECIMAL(10, 2) DEFAULT 0.00,
  is_locked_out BOOLEAN DEFAULT false,
  lockout_reason VARCHAR(100),
  autopay_enabled BOOLEAN DEFAULT false,
  sms_notifications_enabled BOOLEAN DEFAULT true,
  email_notifications_enabled BOOLEAN DEFAULT true,
  source VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_username ON customers(username);

-- Unit types table
CREATE TABLE IF NOT EXISTS unit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  width INTEGER NOT NULL,
  depth INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(facility_id, name)
);

-- Units table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  unit_type_id UUID NOT NULL REFERENCES unit_types(id),
  unit_number VARCHAR(10) NOT NULL,
  monthly_rate DECIMAL(10, 2) NOT NULL,
  late_fee DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  current_tenant_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  gate_code VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(facility_id, unit_number)
);

CREATE INDEX idx_units_facility_status ON units(facility_id, status);
CREATE INDEX idx_units_current_tenant ON units(current_tenant_id);

-- Rentals table
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  scheduled_move_out_date DATE,
  monthly_rate DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) DEFAULT 0.00,
  deposit_paid DECIMAL(10, 2) DEFAULT 0.00,
  late_fee DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  lease_signed BOOLEAN DEFAULT false,
  lease_signed_date TIMESTAMP,
  lease_signature_data JSONB,
  move_in_notes TEXT,
  move_out_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rentals_customer ON rentals(customer_id);
CREATE INDEX idx_rentals_unit ON rentals(unit_id);
CREATE INDEX idx_rentals_facility_status ON rentals(facility_id, status);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  late_fee DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0.00,
  balance DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  first_late_fee_applied BOOLEAN DEFAULT false,
  first_late_fee_applied_date DATE,
  second_late_fee_applied BOOLEAN DEFAULT false,
  second_late_fee_applied_date DATE,
  lockout_applied BOOLEAN DEFAULT false,
  lockout_applied_date DATE,
  lockout_cleared_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_rental ON invoices(rental_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_created ON payments(created_at);

-- Waiting list table
CREATE TABLE IF NOT EXISTS waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  unit_type_id UUID REFERENCES unit_types(id) ON DELETE SET NULL,
  preferred_size VARCHAR(50),
  min_monthly_rate DECIMAL(10, 2),
  max_monthly_rate DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_notified TIMESTAMP,
  date_unit_became_available TIMESTAMP,
  unit_offered_id UUID REFERENCES units(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_waiting_list_facility ON waiting_list(facility_id, status);
CREATE INDEX idx_waiting_list_customer ON waiting_list(customer_id);

-- Communications table
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  stripe_event_id VARCHAR(255),
  twilio_message_sid VARCHAR(255),
  related_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  related_rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP
);

CREATE INDEX idx_communications_customer ON communications(customer_id);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_communications_created ON communications(created_at);

-- Automation log table
CREATE TABLE IF NOT EXISTS automation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL,
  reason_if_skipped VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_automation_log_facility ON automation_log(facility_id, action_type);
CREATE INDEX idx_automation_log_created ON automation_log(created_at);
