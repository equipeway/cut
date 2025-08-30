import { sql, isNeonConfigured } from './neon';
import bcrypt from 'bcryptjs';

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
  user_id: string;
  approved_count: number;
  rejected_count: number;
  loaded_count: number;
  tested_count: number;
  is_active: boolean;
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

// Initialize database tables
export const initializeDatabase = async () => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    console.log('Initializing database tables...');

    // Create user_role enum
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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role user_role DEFAULT 'user',
        subscription_days INTEGER DEFAULT 0,
        allowed_ips TEXT[] DEFAULT '{}',
        is_banned BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Create login_attempts table
    await sql`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address TEXT NOT NULL,
        user_email TEXT,
        success BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Create banned_ips table
    await sql`
      CREATE TABLE IF NOT EXISTS banned_ips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address TEXT UNIQUE NOT NULL,
        reason TEXT DEFAULT 'Violation of terms',
        banned_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
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
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
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
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip_address);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id ON processing_sessions(user_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_purchases_created_at ON user_purchases(created_at);
    `;

    // Insert default subscription plans if they don't exist
    const existingPlans = await sql`SELECT COUNT(*) as count FROM subscription_plans`;
    if (existingPlans[0].count === 0) {
      await sql`
        INSERT INTO subscription_plans (name, days, price, description) VALUES
        ('Plano Básico', 30, 29.90, 'Ideal para uso pessoal com recursos essenciais'),
        ('Plano Standard', 90, 79.90, 'Perfeito para pequenas empresas com recursos avançados'),
        ('Plano Premium', 180, 149.90, 'Para empresas médias com recursos completos'),
        ('Plano Ultimate', 365, 299.90, 'Solução empresarial com todos os recursos')
      `;
    }

    // Create admin user if it doesn't exist
    const adminExists = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`;
    if (adminExists[0].count === 0) {
      await sql`
        INSERT INTO users (email, password_hash, role, subscription_days) 
        VALUES ('admin@terramail.com', 'admin123', 'admin', 999)
      `;
      console.log('Admin user created: admin@terramail.com / admin123');
    }

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// User operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  console.log('getUserByEmail - Searching for email:', email);

  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;

    console.log('getUserByEmail - Neon response:', result);

    if (result.length === 0) {
      console.log('getUserByEmail - No user found');
      return null;
    }

    const user = result[0] as User;
    console.log('getUserByEmail - Found user:', user.email);
    return user;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    const result = await sql`
      SELECT * FROM users ORDER BY created_at DESC
    `;

    return result as User[];
  } catch (error) {
    console.error('Error in getUsers:', error);
    throw error;
  }
};

export const createUser = async (userData: {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  subscription_days?: number;
  allowed_ips?: string[];
}): Promise<User> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    console.log('Creating user with password:', userData.password);
    
    // Save password as plain text as requested
    const plainPassword = userData.password;
    console.log('Using plain text password:', plainPassword);

    const result = await sql`
      INSERT INTO users (email, password_hash, role, subscription_days, allowed_ips)
      VALUES (
        ${userData.email},
        ${plainPassword},
        ${userData.role || 'user'},
        ${userData.subscription_days || 0},
        ${JSON.stringify(userData.allowed_ips || [])}
      )
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('Failed to create user');
    }

    return result[0] as User;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    console.log('Updating user:', userId, 'with updates:', updates);
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    
    if (updates.email !== undefined) {
      updateFields.push('email = $' + (updateFields.length + 2));
      values.push(updates.email);
    }
    if (updates.password_hash !== undefined) {
      updateFields.push('password_hash = $' + (updateFields.length + 2));
      values.push(updates.password_hash);
    }
    if (updates.role !== undefined) {
      updateFields.push('role = $' + (updateFields.length + 2));
      values.push(updates.role);
    }
    if (updates.subscription_days !== undefined) {
      updateFields.push('subscription_days = $' + (updateFields.length + 2));
      values.push(updates.subscription_days);
    }
    if (updates.allowed_ips !== undefined) {
      updateFields.push('allowed_ips = $' + (updateFields.length + 2));
      values.push(JSON.stringify(updates.allowed_ips));
    }
    if (updates.is_banned !== undefined) {
      updateFields.push('is_banned = $' + (updateFields.length + 2));
      values.push(updates.is_banned);
    }
    
    updateFields.push('updated_at = NOW()');

    if (updateFields.length === 1) { // Only updated_at
      return null;
    }

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await sql(query, [userId, ...values]);

    if (result.length === 0) {
      console.log('User not found for update');
      return null;
    }

    console.log('User updated successfully:', result[0]);
    return result[0] as User;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    console.log('Deleting user from Neon:', userId);
    
    const result = await sql`
      DELETE FROM users WHERE id = ${userId}
    `;

    console.log('User deleted successfully from Neon');
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw error;
  }
};

// Processing sessions
export const getUserSession = async (userId: string): Promise<ProcessingSession | null> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    const result = await sql`
      SELECT * FROM processing_sessions 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return result[0] as ProcessingSession;
  } catch (error) {
    console.error('Error in getUserSession:', error);
    throw error;
  }
};

export const createSession = async (userId: string): Promise<ProcessingSession> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    const result = await sql`
      INSERT INTO processing_sessions (user_id, approved_count, rejected_count, loaded_count, tested_count, is_active)
      VALUES (${userId}, 0, 0, 0, 0, false)
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('Failed to create session');
    }

    return result[0] as ProcessingSession;
  } catch (error) {
    console.error('Error in createSession:', error);
    throw error;
  }
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    
    if (updates.approved_count !== undefined) {
      updateFields.push('approved_count = $' + (updateFields.length + 2));
      values.push(updates.approved_count);
    }
    if (updates.rejected_count !== undefined) {
      updateFields.push('rejected_count = $' + (updateFields.length + 2));
      values.push(updates.rejected_count);
    }
    if (updates.loaded_count !== undefined) {
      updateFields.push('loaded_count = $' + (updateFields.length + 2));
      values.push(updates.loaded_count);
    }
    if (updates.tested_count !== undefined) {
      updateFields.push('tested_count = $' + (updateFields.length + 2));
      values.push(updates.tested_count);
    }
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = $' + (updateFields.length + 2));
      values.push(updates.is_active);
    }
    
    updateFields.push('updated_at = NOW()');

    const query = `
      UPDATE processing_sessions 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await sql(query, [sessionId, ...values]);

    if (result.length === 0) {
      throw new Error('Session not found');
    }

    return result[0] as ProcessingSession;
  } catch (error) {
    console.error('Error in updateSession:', error);
    throw error;
  }
};

// Subscription plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    const result = await sql`
      SELECT * FROM subscription_plans 
      WHERE is_active = true 
      ORDER BY price ASC
    `;

    return result as SubscriptionPlan[];
  } catch (error) {
    console.error('Error in getSubscriptionPlans:', error);
    throw error;
  }
};

export const createSubscriptionPlan = async (plan: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): Promise<SubscriptionPlan> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    const result = await sql`
      INSERT INTO subscription_plans (name, days, price, description, is_active)
      VALUES (
        ${plan.name},
        ${plan.days},
        ${plan.price},
        ${plan.description || ''},
        true
      )
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('Failed to create subscription plan');
    }

    return result[0] as SubscriptionPlan;
  } catch (error) {
    console.error('Error in createSubscriptionPlan:', error);
    throw error;
  }
};

export const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    console.log('Updating subscription plan:', planId, 'with updates:', updates);
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      updateFields.push('name = $' + (updateFields.length + 2));
      values.push(updates.name);
    }
    if (updates.days !== undefined) {
      updateFields.push('days = $' + (updateFields.length + 2));
      values.push(updates.days);
    }
    if (updates.price !== undefined) {
      updateFields.push('price = $' + (updateFields.length + 2));
      values.push(updates.price);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = $' + (updateFields.length + 2));
      values.push(updates.description);
    }
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = $' + (updateFields.length + 2));
      values.push(updates.is_active);
    }

    if (updateFields.length === 0) {
      console.log('No fields to update');
      return null;
    }

    const query = `
      UPDATE subscription_plans 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    console.log('Executing query:', query);
    console.log('With values:', [planId, ...values]);

    const result = await sql(query, [planId, ...values]);

    console.log('Update result:', result);

    if (result.length === 0) {
      console.log('No plan found with ID:', planId);
      return null;
    }

    console.log('Plan updated successfully:', result[0]);
    return result[0] as SubscriptionPlan;
  } catch (error) {
    console.error('Error in updateSubscriptionPlan:', error);
    throw error;
  }
};

// User purchases
export const getUserPurchases = async (userId: string): Promise<UserPurchase[]> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    const result = await sql`
      SELECT 
        up.*,
        sp.name as plan_name,
        sp.description as plan_description
      FROM user_purchases up
      LEFT JOIN subscription_plans sp ON up.plan_id = sp.id
      WHERE up.user_id = ${userId}
      ORDER BY up.created_at DESC
    `;

    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      plan_id: row.plan_id,
      days_added: row.days_added,
      amount_paid: Number(row.amount_paid),
      payment_method: row.payment_method,
      created_at: row.created_at,
      plan: row.plan_name ? {
        id: row.plan_id,
        name: row.plan_name,
        description: row.plan_description,
        days: row.days_added,
        price: Number(row.amount_paid),
        is_active: true,
        created_at: row.created_at
      } : undefined
    })) as UserPurchase[];
  } catch (error) {
    console.error('Error in getUserPurchases:', error);
    throw error;
  }
};

export const createPurchase = async (purchase: {
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method?: string;
}): Promise<UserPurchase> => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    const result = await sql`
      INSERT INTO user_purchases (user_id, plan_id, days_added, amount_paid, payment_method)
      VALUES (
        ${purchase.user_id},
        ${purchase.plan_id},
        ${purchase.days_added},
        ${purchase.amount_paid},
        ${purchase.payment_method || 'manual'}
      )
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('Failed to create purchase');
    }

    return result[0] as UserPurchase;
  } catch (error) {
    console.error('Error in createPurchase:', error);
    throw error;
  }
};

// Analytics
export const getSystemStats = async () => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured. Please set VITE_DATABASE_URL environment variable.');
  }

  try {
    // Get user stats
    const users = await sql`
      SELECT role, is_banned, subscription_days FROM users
    `;

    // Get processing stats
    const sessions = await sql`
      SELECT approved_count, rejected_count, tested_count FROM processing_sessions
    `;

    // Get purchase stats
    const purchases = await sql`
      SELECT amount_paid, created_at FROM user_purchases
    `;

    const totalUsers = users.length;
    const activeUsers = users.filter(u => !u.is_banned && u.subscription_days > 0).length;
    const bannedUsers = users.filter(u => u.is_banned).length;
    const adminUsers = users.filter(u => u.role === 'admin').length;

    const totalProcessed = sessions.reduce((sum, s) => sum + s.tested_count, 0);
    const totalApproved = sessions.reduce((sum, s) => sum + s.approved_count, 0);

    const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyRevenue = purchases.filter(p => new Date(p.created_at) > thirtyDaysAgo)
      .reduce((sum, p) => sum + Number(p.amount_paid), 0);

    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      adminUsers,
      totalProcessed,
      totalApproved,
      totalRevenue,
      monthlyRevenue
    };
  } catch (error) {
    console.error('Error in getSystemStats:', error);
    throw error;
  }
};

// Login attempt logging
export const logLoginAttempt = async (ipAddress: string, userEmail: string | null, success: boolean): Promise<void> => {
  if (!isNeonConfigured()) {
    console.warn('Neon not configured, skipping login attempt logging');
    return;
  }

  try {
    await sql`
      INSERT INTO login_attempts (ip_address, user_email, success)
      VALUES (${ipAddress}, ${userEmail}, ${success})
    `;
  } catch (error) {
    console.error('Error in logLoginAttempt:', error);
  }
};

// Check if IP is banned
export const isIPBanned = async (ipAddress: string): Promise<boolean> => {
  if (!isNeonConfigured()) {
    return false;
  }

  try {
    const result = await sql`
      SELECT banned_until FROM banned_ips 
      WHERE ip_address = ${ipAddress}
      LIMIT 1
    `;

    if (result.length === 0) return false;

    const bannedIP = result[0];

    // Check if ban is still active
    if (bannedIP.banned_until) {
      const banExpiry = new Date(bannedIP.banned_until);
      const now = new Date();
      return now < banExpiry;
    }

    // Permanent ban if banned_until is null
    return true;
  } catch (error) {
    console.error('Error in isIPBanned:', error);
    return false;
  }
};