import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_NEON_DATABASE_URL);

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

export async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        subscription_days INTEGER DEFAULT 0,
        allowed_ips TEXT[] DEFAULT '{}',
        is_banned BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create subscription_plans table
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        days INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        description TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create user_purchases table
    await sql`
      CREATE TABLE IF NOT EXISTS user_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
        days_added INTEGER NOT NULL,
        amount_paid DECIMAL(10,2) NOT NULL,
        payment_method TEXT DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create login_attempts table
    await sql`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address TEXT NOT NULL,
        user_email TEXT,
        success BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create banned_ips table
    await sql`
      CREATE TABLE IF NOT EXISTS banned_ips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address TEXT UNIQUE NOT NULL,
        reason TEXT DEFAULT 'Violation of terms',
        banned_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create processing_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS processing_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        approved_count INTEGER DEFAULT 0,
        rejected_count INTEGER DEFAULT 0,
        loaded_count INTEGER DEFAULT 0,
        tested_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Insert default subscription plans
    await sql`
      INSERT INTO subscription_plans (name, days, price, description, is_active)
      VALUES 
        ('Plano Básico', 30, 29.90, 'Acesso por 30 dias', true),
        ('Plano Premium', 90, 79.90, 'Acesso por 90 dias', true),
        ('Plano Anual', 365, 299.90, 'Acesso por 1 ano', true)
      ON CONFLICT DO NOTHING
    `;

    // Insert default admin user
    await sql`
      INSERT INTO users (email, password_hash, role)
      VALUES ('admin@terramail.com', 'admin123', 'admin')
      ON CONFLICT (email) DO NOTHING
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

export async function logLoginAttempt(ipAddress: string, userEmail: string, success: boolean) {
  try {
    await sql`
      INSERT INTO login_attempts (ip_address, user_email, success)
      VALUES (${ipAddress}, ${userEmail}, ${success})
    `;
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const result = await sql`
      SELECT * FROM users ORDER BY created_at DESC
    `;
    return result;
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const result = await sql`
      SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC
    `;
    return result;
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return [];
  }
}

export async function updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>) {
  try {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updates)];
    
    await sql`
      UPDATE subscription_plans 
      SET ${sql.unsafe(setClause)}
      WHERE id = $1
    `.apply(null, values);
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    throw error;
  }
}

export async function banUser(userId: string) {
  try {
    await sql`
      UPDATE users SET is_banned = true WHERE id = ${userId}
    `;
  } catch (error) {
    console.error('Error banning user:', error);
    throw error;
  }
}

export async function unbanUser(userId: string) {
  try {
    await sql`
      UPDATE users SET is_banned = false WHERE id = ${userId}
    `;
  } catch (error) {
    console.error('Error unbanning user:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  return getUsers();
}

export async function getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const result = await sql`
      SELECT * FROM subscription_plans ORDER BY price ASC
    `;
    return result;
  } catch (error) {
    console.error('Error getting all subscription plans:', error);
    return [];
  }
}

export async function deleteSubscriptionPlan(id: string) {
  try {
    await sql`
      DELETE FROM subscription_plans WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    throw error;
  }
}

export async function getAllUserPurchases(): Promise<UserPurchase[]> {
  try {
    const result = await sql`
      SELECT 
        up.*,
        sp.name as plan_name,
        sp.description as plan_description
      FROM user_purchases up
      LEFT JOIN subscription_plans sp ON up.plan_id = sp.id
      ORDER BY up.created_at DESC
    `;
    return result.map(row => ({
      ...row,
      plan: row.plan_name ? {
        id: row.plan_id,
        name: row.plan_name,
        description: row.plan_description,
        days: 0,
        price: 0,
        is_active: true,
        created_at: ''
      } : undefined
    }));
  } catch (error) {
    console.error('Error getting user purchases:', error);
    return [];
  }
}

export async function createUserPurchase(purchase: Omit<UserPurchase, 'id' | 'created_at'>) {
  try {
    await sql`
      INSERT INTO user_purchases (user_id, plan_id, days_added, amount_paid, payment_method)
      VALUES (${purchase.user_id}, ${purchase.plan_id}, ${purchase.days_added}, ${purchase.amount_paid}, ${purchase.payment_method})
    `;
  } catch (error) {
    console.error('Error creating user purchase:', error);
    throw error;
  }
}

export async function updateUserSubscription(userId: string, additionalDays: number) {
  try {
    await sql`
      UPDATE users 
      SET subscription_days = subscription_days + ${additionalDays}
      WHERE id = ${userId}
    `;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}