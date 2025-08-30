import { neon } from '@neondatabase/serverless';
import { isNeonConfigured } from './neon';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  subscription_days: number;
  allowed_ips: string[];
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  days: number;
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface UserPurchase {
  id: string;
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method: string;
  created_at: string;
  plan?: SubscriptionPlan;
}

export interface LoginAttempt {
  id: string;
  ip_address: string;
  user_email: string | null;
  success: boolean;
  created_at: string;
}

export interface BannedIP {
  id: string;
  ip_address: string;
  reason: string;
  banned_until: string | null;
  created_at: string;
}

export interface ProcessingSession {
  id: string;
  user_id: string | null;
  approved_count: number;
  rejected_count: number;
  loaded_count: number;
  tested_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function getDatabase() {
  if (!isNeonConfigured()) {
    throw new Error('Neon database not configured');
  }
  return neon(process.env.NEON_DATABASE_URL!);
}

export async function initializeDatabase() {
  if (!isNeonConfigured()) {
    console.log('Neon not configured, skipping database initialization');
    return;
  }

  const sql = getDatabase();

  try {
    // Create enum type
    await sql`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        role user_role DEFAULT 'user',
        subscription_days integer DEFAULT 0,
        allowed_ips text[] DEFAULT '{}',
        is_banned boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `;

    // Create other tables
    await sql`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address text NOT NULL,
        user_email text,
        success boolean NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS banned_ips (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address text UNIQUE NOT NULL,
        reason text DEFAULT 'Violation of terms',
        banned_until timestamptz,
        created_at timestamptz DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        days integer NOT NULL,
        price numeric(10,2) NOT NULL,
        description text DEFAULT '',
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_purchases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        plan_id uuid REFERENCES subscription_plans(id) ON DELETE CASCADE,
        days_added integer NOT NULL,
        amount_paid numeric(10,2) NOT NULL,
        payment_method text DEFAULT 'manual',
        created_at timestamptz DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS processing_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        approved_count integer DEFAULT 0,
        rejected_count integer DEFAULT 0,
        loaded_count integer DEFAULT 0,
        tested_count integer DEFAULT 0,
        is_active boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip_address);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_purchases_created_at ON user_purchases(created_at);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id ON processing_sessions(user_id);`;

    // Insert default subscription plans
    await sql`
      INSERT INTO subscription_plans (name, days, price, description)
      SELECT * FROM (VALUES
        ('Plano Básico', 30, 29.90, 'Acesso por 30 dias'),
        ('Plano Premium', 90, 79.90, 'Acesso por 90 dias'),
        ('Plano Anual', 365, 299.90, 'Acesso por 1 ano')
      ) AS v(name, days, price, description)
      WHERE NOT EXISTS (SELECT 1 FROM subscription_plans);
    `;

    // Insert default admin user
    await sql`
      INSERT INTO users (email, password_hash, role)
      SELECT 'admin@terramail.com', 'admin123', 'admin'::user_role
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@terramail.com');
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = getDatabase();
  const result = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return result[0] || null;
}

export async function logLoginAttempt(ipAddress: string, userEmail: string | null, success: boolean) {
  const sql = getDatabase();
  await sql`
    INSERT INTO login_attempts (ip_address, user_email, success)
    VALUES (${ipAddress}, ${userEmail}, ${success})
  `;
}

export async function getUsers(): Promise<User[]> {
  const sql = getDatabase();
  return await sql`SELECT * FROM users ORDER BY created_at DESC`;
}

export async function getAllUsers(): Promise<User[]> {
  return getUsers();
}

export async function banUser(userId: string): Promise<void> {
  const sql = getDatabase();
  await sql`UPDATE users SET is_banned = true WHERE id = ${userId}`;
}

export async function unbanUser(userId: string): Promise<void> {
  const sql = getDatabase();
  await sql`UPDATE users SET is_banned = false WHERE id = ${userId}`;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const sql = getDatabase();
  return await sql`SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC`;
}

export async function getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const sql = getDatabase();
  return await sql`SELECT * FROM subscription_plans ORDER BY created_at DESC`;
}

export async function createSubscriptionPlan(name: string, days: number, price: number, description: string = ''): Promise<void> {
  const sql = getDatabase();
  await sql`
    INSERT INTO subscription_plans (name, days, price, description)
    VALUES (${name}, ${days}, ${price}, ${description})
  `;
}

export async function deleteSubscriptionPlan(planId: string): Promise<void> {
  const sql = getDatabase();
  await sql`DELETE FROM subscription_plans WHERE id = ${planId}`;
}

export async function getAllUserPurchases(): Promise<UserPurchase[]> {
  const sql = getDatabase();
  return await sql`
    SELECT 
      up.*,
      sp.name as plan_name,
      sp.description as plan_description
    FROM user_purchases up
    LEFT JOIN subscription_plans sp ON up.plan_id = sp.id
    ORDER BY up.created_at DESC
  `;
}

export async function createUserPurchase(userId: string, planId: string, daysAdded: number, amountPaid: number, paymentMethod: string = 'manual'): Promise<void> {
  const sql = getDatabase();
  await sql`
    INSERT INTO user_purchases (user_id, plan_id, days_added, amount_paid, payment_method)
    VALUES (${userId}, ${planId}, ${daysAdded}, ${amountPaid}, ${paymentMethod})
  `;
}

export async function updateUserSubscription(userId: string, additionalDays: number): Promise<void> {
  const sql = getDatabase();
  await sql`
    UPDATE users 
    SET subscription_days = subscription_days + ${additionalDays}
    WHERE id = ${userId}
  `;
}