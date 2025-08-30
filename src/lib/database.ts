import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

// Database client
const client = createClient({
  url: 'file:terramail.db'
});

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

// Initialize database
export const initDatabase = async () => {
  try {
    // Create users table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        subscription_days INTEGER DEFAULT 0,
        allowed_ips TEXT DEFAULT '[]',
        is_banned BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create login_attempts table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        ip_address TEXT NOT NULL,
        user_email TEXT,
        success BOOLEAN NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create banned_ips table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS banned_ips (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        ip_address TEXT UNIQUE NOT NULL,
        reason TEXT DEFAULT 'Violation of terms',
        banned_until DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create subscription_plans table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        days INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        description TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_purchases table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_purchases (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        days_added INTEGER NOT NULL,
        amount_paid DECIMAL(10,2) NOT NULL,
        payment_method TEXT DEFAULT 'manual',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
      )
    `);

    // Create processing_sessions table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS processing_sessions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        approved_count INTEGER DEFAULT 0,
        rejected_count INTEGER DEFAULT 0,
        loaded_count INTEGER DEFAULT 0,
        tested_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip_address)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id ON processing_sessions(user_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_purchases_created_at ON user_purchases(created_at)`);

    // Insert default subscription plans
    const existingPlans = await client.execute('SELECT COUNT(*) as count FROM subscription_plans');
    if (existingPlans.rows[0].count === 0) {
      await client.execute(`
        INSERT INTO subscription_plans (name, days, price, description) VALUES
        ('Plano Básico', 30, 29.90, 'Ideal para iniciantes com recursos essenciais'),
        ('Plano Standard', 90, 79.90, 'Perfeito para uso regular com recursos avançados'),
        ('Plano Premium', 180, 149.90, 'Para usuários intensivos com máxima performance'),
        ('Plano Ultimate', 365, 299.90, 'Acesso completo por um ano inteiro')
      `);
    }

    // Create default admin user if not exists
    const adminExists = await client.execute(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
    if (adminExists.rows[0].count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.execute({
        sql: `INSERT INTO users (email, password_hash, role, subscription_days) VALUES (?, ?, 'admin', 9999)`,
        args: ['admin@terramail.com', hashedPassword]
      });
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Helper function to generate UUID
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// User operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      email: row.email as string,
      password_hash: row.password_hash as string,
      role: row.role as 'user' | 'admin',
      subscription_days: row.subscription_days as number,
      allowed_ips: JSON.parse(row.allowed_ips as string || '[]'),
      is_banned: Boolean(row.is_banned),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string
    };
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const result = await client.execute('SELECT * FROM users ORDER BY created_at DESC');
    
    return result.rows.map(row => ({
      id: row.id as string,
      email: row.email as string,
      password_hash: row.password_hash as string,
      role: row.role as 'user' | 'admin',
      subscription_days: row.subscription_days as number,
      allowed_ips: JSON.parse(row.allowed_ips as string || '[]'),
      is_banned: Boolean(row.is_banned),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
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
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const id = generateId();
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO users (id, email, password_hash, role, subscription_days, allowed_ips, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        userData.email,
        hashedPassword,
        userData.role || 'user',
        userData.subscription_days || 0,
        JSON.stringify(userData.allowed_ips || []),
        now,
        now
      ]
    });

    return {
      id,
      email: userData.email,
      password_hash: hashedPassword,
      role: userData.role || 'user',
      subscription_days: userData.subscription_days || 0,
      allowed_ips: userData.allowed_ips || [],
      is_banned: false,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  try {
    const setParts: string[] = [];
    const args: any[] = [];

    if (updates.email !== undefined) {
      setParts.push('email = ?');
      args.push(updates.email);
    }
    if (updates.password_hash !== undefined) {
      setParts.push('password_hash = ?');
      args.push(updates.password_hash);
    }
    if (updates.role !== undefined) {
      setParts.push('role = ?');
      args.push(updates.role);
    }
    if (updates.subscription_days !== undefined) {
      setParts.push('subscription_days = ?');
      args.push(updates.subscription_days);
    }
    if (updates.allowed_ips !== undefined) {
      setParts.push('allowed_ips = ?');
      args.push(JSON.stringify(updates.allowed_ips));
    }
    if (updates.is_banned !== undefined) {
      setParts.push('is_banned = ?');
      args.push(updates.is_banned);
    }

    setParts.push('updated_at = ?');
    args.push(new Date().toISOString());
    args.push(userId);

    await client.execute({
      sql: `UPDATE users SET ${setParts.join(', ')} WHERE id = ?`,
      args
    });

    // Return updated user
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId]
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id as string,
      email: row.email as string,
      password_hash: row.password_hash as string,
      role: row.role as 'user' | 'admin',
      subscription_days: row.subscription_days as number,
      allowed_ips: JSON.parse(row.allowed_ips as string || '[]'),
      is_banned: Boolean(row.is_banned),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string
    };
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await client.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [userId]
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Processing sessions
export const getUserSession = async (userId: string): Promise<ProcessingSession | null> => {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM processing_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      args: [userId]
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      approved_count: row.approved_count as number,
      rejected_count: row.rejected_count as number,
      loaded_count: row.loaded_count as number,
      tested_count: row.tested_count as number,
      is_active: Boolean(row.is_active),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string
    };
  } catch (error) {
    console.error('Error fetching user session:', error);
    throw error;
  }
};

export const createSession = async (userId: string): Promise<ProcessingSession> => {
  try {
    const id = generateId();
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO processing_sessions (id, user_id, approved_count, rejected_count, loaded_count, tested_count, is_active, created_at, updated_at) 
            VALUES (?, ?, 0, 0, 0, 0, FALSE, ?, ?)`,
      args: [id, userId, now, now]
    });

    return {
      id,
      user_id: userId,
      approved_count: 0,
      rejected_count: 0,
      loaded_count: 0,
      tested_count: 0,
      is_active: false,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession> => {
  try {
    const setParts: string[] = [];
    const args: any[] = [];

    if (updates.approved_count !== undefined) {
      setParts.push('approved_count = ?');
      args.push(updates.approved_count);
    }
    if (updates.rejected_count !== undefined) {
      setParts.push('rejected_count = ?');
      args.push(updates.rejected_count);
    }
    if (updates.loaded_count !== undefined) {
      setParts.push('loaded_count = ?');
      args.push(updates.loaded_count);
    }
    if (updates.tested_count !== undefined) {
      setParts.push('tested_count = ?');
      args.push(updates.tested_count);
    }
    if (updates.is_active !== undefined) {
      setParts.push('is_active = ?');
      args.push(updates.is_active);
    }

    setParts.push('updated_at = ?');
    args.push(new Date().toISOString());
    args.push(sessionId);

    await client.execute({
      sql: `UPDATE processing_sessions SET ${setParts.join(', ')} WHERE id = ?`,
      args
    });

    // Return updated session
    const result = await client.execute({
      sql: 'SELECT * FROM processing_sessions WHERE id = ?',
      args: [sessionId]
    });

    const row = result.rows[0];
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      approved_count: row.approved_count as number,
      rejected_count: row.rejected_count as number,
      loaded_count: row.loaded_count as number,
      tested_count: row.tested_count as number,
      is_active: Boolean(row.is_active),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string
    };
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

// Subscription plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const result = await client.execute('SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY price ASC');
    
    return result.rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      days: row.days as number,
      price: Number(row.price),
      description: row.description as string,
      is_active: Boolean(row.is_active),
      created_at: row.created_at as string
    }));
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
};

export const createSubscriptionPlan = async (plan: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): Promise<SubscriptionPlan> => {
  try {
    const id = generateId();
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO subscription_plans (id, name, days, price, description, is_active, created_at) 
            VALUES (?, ?, ?, ?, ?, TRUE, ?)`,
      args: [id, plan.name, plan.days, plan.price, plan.description || '', now]
    });

    return {
      id,
      name: plan.name,
      days: plan.days,
      price: plan.price,
      description: plan.description || '',
      is_active: true,
      created_at: now
    };
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    throw error;
  }
};

export const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> => {
  try {
    const setParts: string[] = [];
    const args: any[] = [];

    if (updates.name !== undefined) {
      setParts.push('name = ?');
      args.push(updates.name);
    }
    if (updates.days !== undefined) {
      setParts.push('days = ?');
      args.push(updates.days);
    }
    if (updates.price !== undefined) {
      setParts.push('price = ?');
      args.push(updates.price);
    }
    if (updates.description !== undefined) {
      setParts.push('description = ?');
      args.push(updates.description);
    }
    if (updates.is_active !== undefined) {
      setParts.push('is_active = ?');
      args.push(updates.is_active);
    }

    if (setParts.length === 0) return null;

    args.push(planId);

    await client.execute({
      sql: `UPDATE subscription_plans SET ${setParts.join(', ')} WHERE id = ?`,
      args
    });

    // Return updated plan
    const result = await client.execute({
      sql: 'SELECT * FROM subscription_plans WHERE id = ?',
      args: [planId]
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id as string,
      name: row.name as string,
      days: row.days as number,
      price: Number(row.price),
      description: row.description as string,
      is_active: Boolean(row.is_active),
      created_at: row.created_at as string
    };
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    throw error;
  }
};

export const deleteSubscriptionPlan = async (planId: string): Promise<void> => {
  try {
    await client.execute({
      sql: 'DELETE FROM subscription_plans WHERE id = ?',
      args: [planId]
    });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    throw error;
  }
};

// User purchases
export const getUserPurchases = async (userId: string): Promise<UserPurchase[]> => {
  try {
    const result = await client.execute({
      sql: `SELECT up.*, sp.name as plan_name, sp.description as plan_description 
            FROM user_purchases up 
            LEFT JOIN subscription_plans sp ON up.plan_id = sp.id 
            WHERE up.user_id = ? 
            ORDER BY up.created_at DESC`,
      args: [userId]
    });

    return result.rows.map(row => ({
      id: row.id as string,
      user_id: row.user_id as string,
      plan_id: row.plan_id as string,
      days_added: row.days_added as number,
      amount_paid: Number(row.amount_paid),
      payment_method: row.payment_method as string,
      created_at: row.created_at as string,
      plan: row.plan_name ? {
        id: row.plan_id as string,
        name: row.plan_name as string,
        days: row.days_added as number,
        price: Number(row.amount_paid),
        description: row.plan_description as string,
        is_active: true,
        created_at: row.created_at as string
      } : undefined
    }));
  } catch (error) {
    console.error('Error fetching user purchases:', error);
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
  try {
    const id = generateId();
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO user_purchases (id, user_id, plan_id, days_added, amount_paid, payment_method, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        purchase.user_id,
        purchase.plan_id,
        purchase.days_added,
        purchase.amount_paid,
        purchase.payment_method || 'manual',
        now
      ]
    });

    return {
      id,
      user_id: purchase.user_id,
      plan_id: purchase.plan_id,
      days_added: purchase.days_added,
      amount_paid: purchase.amount_paid,
      payment_method: purchase.payment_method || 'manual',
      created_at: now
    };
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
};

// Analytics
export const getSystemStats = async () => {
  try {
    // Get user stats
    const userStats = await client.execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
        SUM(CASE WHEN is_banned = TRUE THEN 1 ELSE 0 END) as banned_users,
        SUM(CASE WHEN is_banned = FALSE AND subscription_days > 0 THEN 1 ELSE 0 END) as active_users
      FROM users
    `);

    // Get processing stats
    const processingStats = await client.execute(`
      SELECT 
        SUM(approved_count) as total_approved,
        SUM(tested_count) as total_processed
      FROM processing_sessions
    `);

    // Get purchase stats
    const purchaseStats = await client.execute(`
      SELECT 
        SUM(amount_paid) as total_revenue,
        SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN amount_paid ELSE 0 END) as monthly_revenue
      FROM user_purchases
    `);

    const userRow = userStats.rows[0];
    const processingRow = processingStats.rows[0];
    const purchaseRow = purchaseStats.rows[0];

    return {
      totalUsers: Number(userRow.total_users) || 0,
      activeUsers: Number(userRow.active_users) || 0,
      bannedUsers: Number(userRow.banned_users) || 0,
      adminUsers: Number(userRow.admin_users) || 0,
      totalProcessed: Number(processingRow.total_processed) || 0,
      totalApproved: Number(processingRow.total_approved) || 0,
      totalRevenue: Number(purchaseRow.total_revenue) || 0,
      monthlyRevenue: Number(purchaseRow.monthly_revenue) || 0
    };
  } catch (error) {
    console.error('Error in getSystemStats:', error);
    throw error;
  }
};

// Login attempt logging
export const logLoginAttempt = async (ipAddress: string, userEmail: string | null, success: boolean): Promise<void> => {
  try {
    const id = generateId();
    const now = new Date().toISOString();

    await client.execute({
      sql: 'INSERT INTO login_attempts (id, ip_address, user_email, success, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [id, ipAddress, userEmail, success, now]
    });
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
};

// Check if IP is banned
export const isIPBanned = async (ipAddress: string): Promise<boolean> => {
  try {
    const result = await client.execute({
      sql: 'SELECT banned_until FROM banned_ips WHERE ip_address = ?',
      args: [ipAddress]
    });

    if (result.rows.length === 0) return false;

    const bannedUntil = result.rows[0].banned_until as string | null;
    
    if (!bannedUntil) return true; // Permanent ban

    // Check if ban is still active
    const banExpiry = new Date(bannedUntil);
    const now = new Date();
    return now < banExpiry;
  } catch (error) {
    console.error('Error checking banned IP:', error);
    return false;
  }
};

// Database health check
export const isDatabaseReady = (): boolean => {
  return true; // SQLite is always ready once initialized
};