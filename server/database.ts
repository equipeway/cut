import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

// Database file path
const DB_PATH = path.join(process.cwd(), 'server', 'terramail.db');

// Initialize database connection
const db = new Database(DB_PATH);

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  subscription_days: number;
  allowed_ips: string;
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

// Helper function to generate UUID
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Get current timestamp
const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

// Initialize database tables
export const initDatabase = async (): Promise<void> => {
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        subscription_days INTEGER DEFAULT 0,
        allowed_ips TEXT DEFAULT '[]',
        is_banned BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create login_attempts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        ip_address TEXT NOT NULL,
        user_email TEXT,
        success BOOLEAN NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create banned_ips table
    db.exec(`
      CREATE TABLE IF NOT EXISTS banned_ips (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        ip_address TEXT UNIQUE NOT NULL,
        reason TEXT DEFAULT 'Violation of terms',
        banned_until TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create subscription_plans table
    db.exec(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        days INTEGER NOT NULL,
        price REAL NOT NULL,
        description TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create user_purchases table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_purchases (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        days_added INTEGER NOT NULL,
        amount_paid REAL NOT NULL,
        payment_method TEXT DEFAULT 'manual',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
      )
    `);

    // Create processing_sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS processing_sessions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        approved_count INTEGER DEFAULT 0,
        rejected_count INTEGER DEFAULT 0,
        loaded_count INTEGER DEFAULT 0,
        tested_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
      CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
      CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip_address);
      CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_purchases_created_at ON user_purchases(created_at);
      CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id ON processing_sessions(user_id);
    `);

    // Insert default admin user if not exists
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('admin@terramail.com') as { count: number };
    
    if (adminExists.count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.prepare(`
        INSERT INTO users (id, email, password_hash, role, subscription_days, allowed_ips, is_banned, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(),
        'admin@terramail.com',
        hashedPassword,
        'admin',
        9999,
        '[]',
        0,
        getCurrentTimestamp(),
        getCurrentTimestamp()
      );
    }

    // Insert default subscription plans if not exist
    const plansCount = db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get() as { count: number };
    
    if (plansCount.count === 0) {
      const plans = [
        {
          name: 'Plano Básico',
          days: 30,
          price: 29.90,
          description: 'Ideal para iniciantes com recursos essenciais'
        },
        {
          name: 'Plano Standard',
          days: 90,
          price: 79.90,
          description: 'Perfeito para uso regular com recursos avançados'
        },
        {
          name: 'Plano Premium',
          days: 180,
          price: 149.90,
          description: 'Para usuários intensivos com máxima performance'
        },
        {
          name: 'Plano Ultimate',
          days: 365,
          price: 299.90,
          description: 'Acesso completo por um ano inteiro'
        }
      ];

      const insertPlan = db.prepare(`
        INSERT INTO subscription_plans (id, name, days, price, description, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const plan of plans) {
        insertPlan.run(
          generateId(),
          plan.name,
          plan.days,
          plan.price,
          plan.description,
          1,
          getCurrentTimestamp()
        );
      }
    }

    console.log('✅ SQLite Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// User operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    if (user && user.allowed_ips) {
      user.allowed_ips = JSON.parse(user.allowed_ips);
    }
    return user || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (user && user.allowed_ips) {
      user.allowed_ips = JSON.parse(user.allowed_ips);
    }
    return user || null;
  } catch (error) {
    console.error('Error fetching user by id:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
    return users.map(user => ({
      ...user,
      allowed_ips: JSON.parse(user.allowed_ips || '[]')
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
    // Check if user already exists
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email já está em uso');
    }

    // Hash password
    const password_hash = await bcrypt.hash(userData.password, 10);

    const newUser = {
      id: generateId(),
      email: userData.email,
      password_hash,
      role: userData.role || 'user',
      subscription_days: userData.subscription_days || 0,
      allowed_ips: JSON.stringify(userData.allowed_ips || []),
      is_banned: 0,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    };

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, subscription_days, allowed_ips, is_banned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newUser.id,
      newUser.email,
      newUser.password_hash,
      newUser.role,
      newUser.subscription_days,
      newUser.allowed_ips,
      newUser.is_banned,
      newUser.created_at,
      newUser.updated_at
    );
    
    return {
      ...newUser,
      allowed_ips: JSON.parse(newUser.allowed_ips),
      is_banned: Boolean(newUser.is_banned)
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return null;
    }

    const updatedData = {
      ...updates,
      allowed_ips: updates.allowed_ips ? JSON.stringify(updates.allowed_ips) : undefined,
      is_banned: updates.is_banned !== undefined ? (updates.is_banned ? 1 : 0) : undefined,
      updated_at: getCurrentTimestamp()
    };

    // Build dynamic update query
    const fields = Object.keys(updatedData).filter(key => updatedData[key as keyof typeof updatedData] !== undefined);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updatedData[field as keyof typeof updatedData]);

    db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values, userId);
    
    return await getUserById(userId);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

// Processing sessions
export const getUserSession = async (userId: string): Promise<ProcessingSession | null> => {
  try {
    const session = db.prepare('SELECT * FROM processing_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as ProcessingSession | undefined;
    return session || null;
  } catch (error) {
    console.error('Error fetching user session:', error);
    throw error;
  }
};

export const createSession = async (userId: string): Promise<ProcessingSession> => {
  try {
    const newSession = {
      id: generateId(),
      user_id: userId,
      approved_count: 0,
      rejected_count: 0,
      loaded_count: 0,
      tested_count: 0,
      is_active: 0,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    };

    db.prepare(`
      INSERT INTO processing_sessions (id, user_id, approved_count, rejected_count, loaded_count, tested_count, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newSession.id,
      newSession.user_id,
      newSession.approved_count,
      newSession.rejected_count,
      newSession.loaded_count,
      newSession.tested_count,
      newSession.is_active,
      newSession.created_at,
      newSession.updated_at
    );
    
    return {
      ...newSession,
      is_active: Boolean(newSession.is_active)
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession> => {
  try {
    const updatedData = {
      ...updates,
      is_active: updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : undefined,
      updated_at: getCurrentTimestamp()
    };

    // Build dynamic update query
    const fields = Object.keys(updatedData).filter(key => updatedData[key as keyof typeof updatedData] !== undefined);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updatedData[field as keyof typeof updatedData]);

    db.prepare(`UPDATE processing_sessions SET ${setClause} WHERE id = ?`).run(...values, sessionId);
    
    const session = db.prepare('SELECT * FROM processing_sessions WHERE id = ?').get(sessionId) as ProcessingSession;
    return {
      ...session,
      is_active: Boolean(session.is_active)
    };
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

// Subscription plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const plans = db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC').all() as SubscriptionPlan[];
    return plans.map(plan => ({
      ...plan,
      is_active: Boolean(plan.is_active)
    }));
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
};

export const getAllSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const plans = db.prepare('SELECT * FROM subscription_plans ORDER BY price ASC').all() as SubscriptionPlan[];
    return plans.map(plan => ({
      ...plan,
      is_active: Boolean(plan.is_active)
    }));
  } catch (error) {
    console.error('Error fetching all subscription plans:', error);
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
    const newPlan = {
      id: generateId(),
      name: plan.name,
      days: plan.days,
      price: plan.price,
      description: plan.description || '',
      is_active: 1,
      created_at: getCurrentTimestamp()
    };

    db.prepare(`
      INSERT INTO subscription_plans (id, name, days, price, description, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newPlan.id,
      newPlan.name,
      newPlan.days,
      newPlan.price,
      newPlan.description,
      newPlan.is_active,
      newPlan.created_at
    );
    
    return {
      ...newPlan,
      is_active: Boolean(newPlan.is_active)
    };
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    throw error;
  }
};

export const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> => {
  try {
    const updatedData = {
      ...updates,
      is_active: updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : undefined
    };

    // Build dynamic update query
    const fields = Object.keys(updatedData).filter(key => updatedData[key as keyof typeof updatedData] !== undefined);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updatedData[field as keyof typeof updatedData]);

    db.prepare(`UPDATE subscription_plans SET ${setClause} WHERE id = ?`).run(...values, planId);
    
    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(planId) as SubscriptionPlan | undefined;
    return plan ? { ...plan, is_active: Boolean(plan.is_active) } : null;
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    throw error;
  }
};

export const deleteSubscriptionPlan = async (planId: string): Promise<void> => {
  try {
    db.prepare('DELETE FROM subscription_plans WHERE id = ?').run(planId);
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    throw error;
  }
};

// User purchases
export const getUserPurchases = async (userId: string): Promise<UserPurchase[]> => {
  try {
    const purchases = db.prepare(`
      SELECT 
        up.*,
        sp.name as plan_name,
        sp.description as plan_description
      FROM user_purchases up
      LEFT JOIN subscription_plans sp ON up.plan_id = sp.id
      WHERE up.user_id = ?
      ORDER BY up.created_at DESC
    `).all(userId) as any[];
    
    return purchases.map(purchase => ({
      id: purchase.id,
      user_id: purchase.user_id,
      plan_id: purchase.plan_id,
      days_added: purchase.days_added,
      amount_paid: purchase.amount_paid,
      payment_method: purchase.payment_method,
      created_at: purchase.created_at,
      plan: purchase.plan_name ? {
        id: purchase.plan_id,
        name: purchase.plan_name,
        description: purchase.plan_description,
        days: purchase.days_added,
        price: purchase.amount_paid,
        is_active: true,
        created_at: purchase.created_at
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
    const newPurchase = {
      id: generateId(),
      user_id: purchase.user_id,
      plan_id: purchase.plan_id,
      days_added: purchase.days_added,
      amount_paid: purchase.amount_paid,
      payment_method: purchase.payment_method || 'manual',
      created_at: getCurrentTimestamp()
    };

    // Start transaction
    const transaction = db.transaction(() => {
      // Insert purchase
      db.prepare(`
        INSERT INTO user_purchases (id, user_id, plan_id, days_added, amount_paid, payment_method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        newPurchase.id,
        newPurchase.user_id,
        newPurchase.plan_id,
        newPurchase.days_added,
        newPurchase.amount_paid,
        newPurchase.payment_method,
        newPurchase.created_at
      );

      // Update user subscription days
      db.prepare(`
        UPDATE users 
        SET subscription_days = subscription_days + ?, updated_at = ?
        WHERE id = ?
      `).run(purchase.days_added, getCurrentTimestamp(), purchase.user_id);
    });

    transaction();
    
    return newPurchase;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
};

// Analytics
export const getSystemStats = async () => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const adminUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
    const bannedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 1').get() as { count: number };
    const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 0 AND subscription_days > 0').get() as { count: number };
    
    const totalProcessed = db.prepare('SELECT COALESCE(SUM(tested_count), 0) as total FROM processing_sessions').get() as { total: number };
    const totalApproved = db.prepare('SELECT COALESCE(SUM(approved_count), 0) as total FROM processing_sessions').get() as { total: number };
    
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM user_purchases').get() as { total: number };
    
    // Monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as total 
      FROM user_purchases 
      WHERE created_at > ?
    `).get(thirtyDaysAgo.toISOString()) as { total: number };

    return {
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      bannedUsers: bannedUsers.count,
      adminUsers: adminUsers.count,
      totalProcessed: totalProcessed.total,
      totalApproved: totalApproved.total,
      totalRevenue: totalRevenue.total,
      monthlyRevenue: monthlyRevenue.total
    };
  } catch (error) {
    console.error('Error in getSystemStats:', error);
    throw error;
  }
};

// Login attempt logging
export const logLoginAttempt = async (ipAddress: string, userEmail: string | null, success: boolean): Promise<void> => {
  try {
    db.prepare(`
      INSERT INTO login_attempts (id, ip_address, user_email, success, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      generateId(),
      ipAddress,
      userEmail,
      success ? 1 : 0,
      getCurrentTimestamp()
    );
    
    // Clean old login attempts (keep only last 1000)
    const count = db.prepare('SELECT COUNT(*) as count FROM login_attempts').get() as { count: number };
    if (count.count > 1000) {
      db.prepare(`
        DELETE FROM login_attempts 
        WHERE id NOT IN (
          SELECT id FROM login_attempts 
          ORDER BY created_at DESC 
          LIMIT 1000
        )
      `).run();
    }
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
};

// Check if IP is banned
export const isIPBanned = async (ipAddress: string): Promise<boolean> => {
  try {
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
    
    const recentFailedAttempts = db.prepare(`
      SELECT COUNT(*) as count 
      FROM login_attempts 
      WHERE ip_address = ? AND success = 0 AND created_at > ?
    `).get(ipAddress, fifteenMinutesAgo.toISOString()) as { count: number };
    
    // Ban if more than 5 failed attempts in 15 minutes
    return recentFailedAttempts.count >= 5;
  } catch (error) {
    console.error('Error checking banned IP:', error);
    return false;
  }
};

// Database health check
export const isDatabaseReady = (): boolean => {
  try {
    const result = db.prepare('SELECT 1').get();
    return !!result;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Close database connection gracefully
process.on('exit', () => {
  db.close();
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});