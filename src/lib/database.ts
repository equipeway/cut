import Database from 'better-sqlite3';

// Database types
export interface User {
  id: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  subscription_days: number;
  allowed_ips: string;
  is_banned: number;
  created_at: string;
  updated_at: string;
}

export interface ProcessingSession {
  id: string;
  user_id: string;
  approved_count: number;
  rejected_count: number;
  loaded_count: number;
  tested_count: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  days: number;
  price: number;
  description: string;
  is_active: number;
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
}

// Initialize database
let db: Database.Database;

try {
  db = new Database('terramail.db');
  db.pragma('journal_mode = WAL');
} catch (error) {
  console.error('Failed to initialize database:', error);
  throw error;
}

// Helper functions
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Create tables
const createTables = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      subscription_days INTEGER DEFAULT 0,
      allowed_ips TEXT DEFAULT '[]',
      is_banned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Processing sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS processing_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      approved_count INTEGER DEFAULT 0,
      rejected_count INTEGER DEFAULT 0,
      loaded_count INTEGER DEFAULT 0,
      tested_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Subscription plans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      days INTEGER NOT NULL,
      price REAL NOT NULL,
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User purchases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      days_added INTEGER NOT NULL,
      amount_paid REAL NOT NULL,
      payment_method TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
    )
  `);

  // Login attempts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      ip_address TEXT NOT NULL,
      user_email TEXT,
      success INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id ON processing_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
    CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_purchases_created_at ON user_purchases(created_at);
  `);
};

// Initialize default data
const initializeDefaultData = () => {
  // Check if admin user exists
  const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
  
  if (adminExists.count === 0) {
    // Create admin user
    const adminId = generateId();
    db.prepare(`
      INSERT INTO users (id, email, password, role, subscription_days, allowed_ips, is_banned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      'admin@terramail.com',
      'admin123',
      'admin',
      9999,
      '[]',
      0,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  // Check if plans exist
  const plansCount = db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get() as { count: number };
  
  if (plansCount.count === 0) {
    // Create default plans
    const plans = [
      {
        id: generateId(),
        name: 'Plano Básico',
        days: 30,
        price: 29.90,
        description: 'Ideal para iniciantes com recursos essenciais',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: generateId(),
        name: 'Plano Standard',
        days: 90,
        price: 79.90,
        description: 'Perfeito para uso regular com recursos avançados',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: generateId(),
        name: 'Plano Premium',
        days: 180,
        price: 149.90,
        description: 'Para usuários intensivos com máxima performance',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: generateId(),
        name: 'Plano Ultimate',
        days: 365,
        price: 299.90,
        description: 'Acesso completo por um ano inteiro',
        is_active: 1,
        created_at: new Date().toISOString()
      }
    ];

    const insertPlan = db.prepare(`
      INSERT INTO subscription_plans (id, name, days, price, description, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const plan of plans) {
      insertPlan.run(plan.id, plan.name, plan.days, plan.price, plan.description, plan.is_active, plan.created_at);
    }
  }
};

// User operations
export const getUserByEmail = (email: string): User | null => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    return user || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
};

export const getUserById = (id: string): User | null => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    return user || null;
  } catch (error) {
    console.error('Error getting user by id:', error);
    return null;
  }
};

export const getUsers = (): User[] => {
  try {
    return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const createUser = (userData: {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  subscription_days?: number;
}): User => {
  // Check if user already exists
  if (getUserByEmail(userData.email)) {
    throw new Error('Email já está em uso');
  }

  const newUser = {
    id: generateId(),
    email: userData.email,
    password: userData.password,
    role: userData.role || 'user',
    subscription_days: userData.subscription_days || 0,
    allowed_ips: '[]',
    is_banned: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, role, subscription_days, allowed_ips, is_banned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newUser.id,
      newUser.email,
      newUser.password,
      newUser.role,
      newUser.subscription_days,
      newUser.allowed_ips,
      newUser.is_banned,
      newUser.created_at,
      newUser.updated_at
    );

    return newUser as User;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Erro ao criar usuário');
  }
};

export const updateUser = (userId: string, updates: Partial<User>): User | null => {
  try {
    const user = getUserById(userId);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString()
    };

    db.prepare(`
      UPDATE users 
      SET email = ?, password = ?, role = ?, subscription_days = ?, allowed_ips = ?, is_banned = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updatedUser.email,
      updatedUser.password,
      updatedUser.role,
      updatedUser.subscription_days,
      updatedUser.allowed_ips,
      updatedUser.is_banned,
      updatedUser.updated_at,
      userId
    );

    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
};

export const deleteUser = (userId: string): void => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Erro ao deletar usuário');
  }
};

// Session operations
export const getUserSession = (userId: string): ProcessingSession | null => {
  try {
    const session = db.prepare('SELECT * FROM processing_sessions WHERE user_id = ?').get(userId) as ProcessingSession | undefined;
    return session || null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
};

export const createSession = (userId: string): ProcessingSession => {
  try {
    // Remove existing session for this user
    db.prepare('DELETE FROM processing_sessions WHERE user_id = ?').run(userId);
    
    const newSession = {
      id: generateId(),
      user_id: userId,
      approved_count: 0,
      rejected_count: 0,
      loaded_count: 0,
      tested_count: 0,
      is_active: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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

    return newSession as ProcessingSession;
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error('Erro ao criar sessão');
  }
};

export const updateSession = (sessionId: string, updates: Partial<ProcessingSession>): ProcessingSession | null => {
  try {
    const session = db.prepare('SELECT * FROM processing_sessions WHERE id = ?').get(sessionId) as ProcessingSession | undefined;
    if (!session) return null;

    const updatedSession = {
      ...session,
      ...updates,
      updated_at: new Date().toISOString()
    };

    db.prepare(`
      UPDATE processing_sessions 
      SET approved_count = ?, rejected_count = ?, loaded_count = ?, tested_count = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updatedSession.approved_count,
      updatedSession.rejected_count,
      updatedSession.loaded_count,
      updatedSession.tested_count,
      updatedSession.is_active,
      updatedSession.updated_at,
      sessionId
    );

    return updatedSession;
  } catch (error) {
    console.error('Error updating session:', error);
    return null;
  }
};

// Plan operations
export const getSubscriptionPlans = (): SubscriptionPlan[] => {
  try {
    return db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC').all() as SubscriptionPlan[];
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return [];
  }
};

export const getAllSubscriptionPlans = (): SubscriptionPlan[] => {
  try {
    return db.prepare('SELECT * FROM subscription_plans ORDER BY created_at DESC').all() as SubscriptionPlan[];
  } catch (error) {
    console.error('Error getting all subscription plans:', error);
    return [];
  }
};

export const createSubscriptionPlan = (planData: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): SubscriptionPlan => {
  try {
    const newPlan = {
      id: generateId(),
      name: planData.name,
      days: planData.days,
      price: planData.price,
      description: planData.description || '',
      is_active: 1,
      created_at: new Date().toISOString()
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

    return newPlan as SubscriptionPlan;
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    throw new Error('Erro ao criar plano');
  }
};

export const updateSubscriptionPlan = (planId: string, updates: Partial<SubscriptionPlan>): SubscriptionPlan | null => {
  try {
    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(planId) as SubscriptionPlan | undefined;
    if (!plan) return null;

    const updatedPlan = {
      ...plan,
      ...updates
    };

    db.prepare(`
      UPDATE subscription_plans 
      SET name = ?, days = ?, price = ?, description = ?, is_active = ?
      WHERE id = ?
    `).run(
      updatedPlan.name,
      updatedPlan.days,
      updatedPlan.price,
      updatedPlan.description,
      updatedPlan.is_active,
      planId
    );

    return updatedPlan;
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return null;
  }
};

export const deleteSubscriptionPlan = (planId: string): void => {
  try {
    db.prepare('DELETE FROM subscription_plans WHERE id = ?').run(planId);
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    throw new Error('Erro ao deletar plano');
  }
};

// Purchase operations
export const createPurchase = (purchaseData: {
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method?: string;
}): UserPurchase => {
  try {
    const newPurchase = {
      id: generateId(),
      user_id: purchaseData.user_id,
      plan_id: purchaseData.plan_id,
      days_added: purchaseData.days_added,
      amount_paid: purchaseData.amount_paid,
      payment_method: purchaseData.payment_method || 'manual',
      created_at: new Date().toISOString()
    };

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
    const user = getUserById(purchaseData.user_id);
    if (user) {
      updateUser(user.id, {
        subscription_days: user.subscription_days + purchaseData.days_added
      });
    }

    return newPurchase as UserPurchase;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw new Error('Erro ao criar compra');
  }
};

// Stats
export const getSystemStats = () => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 0 AND subscription_days > 0').get() as { count: number };
    const bannedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 1').get() as { count: number };
    const adminUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
    
    const totalProcessed = db.prepare('SELECT SUM(tested_count) as total FROM processing_sessions').get() as { total: number | null };
    const totalApproved = db.prepare('SELECT SUM(approved_count) as total FROM processing_sessions').get() as { total: number | null };
    const totalRevenue = db.prepare('SELECT SUM(amount_paid) as total FROM user_purchases').get() as { total: number | null };
    
    // Monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyRevenue = db.prepare('SELECT SUM(amount_paid) as total FROM user_purchases WHERE created_at > ?').get(thirtyDaysAgo.toISOString()) as { total: number | null };

    return {
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      bannedUsers: bannedUsers.count,
      adminUsers: adminUsers.count,
      totalProcessed: totalProcessed.total || 0,
      totalApproved: totalApproved.total || 0,
      totalRevenue: totalRevenue.total || 0,
      monthlyRevenue: monthlyRevenue.total || 0
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      bannedUsers: 0,
      adminUsers: 0,
      totalProcessed: 0,
      totalApproved: 0,
      totalRevenue: 0,
      monthlyRevenue: 0
    };
  }
};

// Initialize database
export const initDatabase = (): void => {
  try {
    createTables();
    initializeDefaultData();
    console.log('✅ SQLite database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Initialize on import
initDatabase();