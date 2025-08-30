import initSqlJs from 'sql.js';

// Database types
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
}

// SQLite database instance
let db: any = null;
let isInitialized = false;

// Helper functions
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Initialize SQLite database
const initDatabase = async () => {
  if (isInitialized) return;

  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });

    // Try to load existing database from IndexedDB
    let data: Uint8Array | undefined;
    try {
      const savedData = await loadDatabaseFromIndexedDB();
      if (savedData) {
        data = new Uint8Array(savedData);
      }
    } catch (error) {
      console.log('No existing database found, creating new one');
    }

    db = new SQL.Database(data);
    
    // Create tables
    createTables();
    
    // Initialize default data if database is empty
    const userCount = db.exec('SELECT COUNT(*) as count FROM users')[0];
    if (!userCount || userCount.values[0][0] === 0) {
      initializeDefaultData();
    }

    isInitialized = true;
    console.log('✅ SQLite database initialized successfully');

    // Save database periodically
    setInterval(saveDatabaseToIndexedDB, 5000);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

// Save database to IndexedDB for persistence
const saveDatabaseToIndexedDB = async () => {
  if (!db) return;

  try {
    const data = db.export();
    const request = indexedDB.open('TerraMailDB', 1);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('database')) {
        db.createObjectStore('database');
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['database'], 'readwrite');
      const store = transaction.objectStore('database');
      store.put(Array.from(data), 'terramail.db');
    };
  } catch (error) {
    console.error('Error saving database:', error);
  }
};

// Load database from IndexedDB
const loadDatabaseFromIndexedDB = (): Promise<number[] | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TerraMailDB', 1);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('database')) {
        db.createObjectStore('database');
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['database'], 'readonly');
      const store = transaction.objectStore('database');
      const getRequest = store.get('terramail.db');
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

// Create tables
const createTables = () => {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        subscription_days INTEGER DEFAULT 0,
        allowed_ips TEXT DEFAULT '[]',
        is_banned BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS processing_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        approved_count INTEGER DEFAULT 0,
        rejected_count INTEGER DEFAULT 0,
        loaded_count INTEGER DEFAULT 0,
        tested_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        days INTEGER NOT NULL,
        price REAL NOT NULL,
        description TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
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

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

// Initialize default data
const initializeDefaultData = () => {
  try {
    // Create admin user
    const adminId = generateId();
    db.run(`
      INSERT INTO users (id, email, password_hash, role, subscription_days, allowed_ips, is_banned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      adminId,
      'admin@terramail.com',
      'admin123',
      'admin',
      9999,
      '[]',
      0,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    // Create default plans
    const plans = [
      {
        id: generateId(),
        name: 'Plano Básico',
        days: 30,
        price: 29.90,
        description: 'Ideal para iniciantes com recursos essenciais'
      },
      {
        id: generateId(),
        name: 'Plano Standard',
        days: 90,
        price: 79.90,
        description: 'Perfeito para uso regular com recursos avançados'
      },
      {
        id: generateId(),
        name: 'Plano Premium',
        days: 180,
        price: 149.90,
        description: 'Para usuários intensivos com máxima performance'
      },
      {
        id: generateId(),
        name: 'Plano Ultimate',
        days: 365,
        price: 299.90,
        description: 'Acesso completo por um ano inteiro'
      }
    ];

    for (const plan of plans) {
      db.run(`
        INSERT INTO subscription_plans (id, name, days, price, description, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        plan.id,
        plan.name,
        plan.days,
        plan.price,
        plan.description,
        1,
        new Date().toISOString()
      ]);
    }

    console.log('✅ Default data initialized');
  } catch (error) {
    console.error('❌ Error initializing default data:', error);
    throw error;
  }
};

// Ensure database is initialized before any operation
const ensureInitialized = async () => {
  if (!isInitialized) {
    await initDatabase();
  }
};

// User operations
export const getUserByEmailDB = async (email: string): Promise<User | null> => {
  await ensureInitialized();
  try {
    const result = db.exec('SELECT * FROM users WHERE email = ?', [email]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0] as string,
      email: row[1] as string,
      password_hash: row[2] as string,
      role: row[3] as 'user' | 'admin',
      subscription_days: row[4] as number,
      allowed_ips: JSON.parse(row[5] as string),
      is_banned: Boolean(row[6]),
      created_at: row[7] as string,
      updated_at: row[8] as string
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
};

export const getUserByIdDB = async (id: string): Promise<User | null> => {
  await ensureInitialized();
  try {
    const result = db.exec('SELECT * FROM users WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0] as string,
      email: row[1] as string,
      password_hash: row[2] as string,
      role: row[3] as 'user' | 'admin',
      subscription_days: row[4] as number,
      allowed_ips: JSON.parse(row[5] as string),
      is_banned: Boolean(row[6]),
      created_at: row[7] as string,
      updated_at: row[8] as string
    };
  } catch (error) {
    console.error('Error getting user by id:', error);
    return null;
  }
};

export const getUsersDB = async (): Promise<User[]> => {
  await ensureInitialized();
  try {
    const result = db.exec('SELECT * FROM users ORDER BY created_at DESC');
    if (result.length === 0) return [];
    
    return result[0].values.map((row: any[]) => ({
      id: row[0] as string,
      email: row[1] as string,
      password_hash: row[2] as string,
      role: row[3] as 'user' | 'admin',
      subscription_days: row[4] as number,
      allowed_ips: JSON.parse(row[5] as string),
      is_banned: Boolean(row[6]),
      created_at: row[7] as string,
      updated_at: row[8] as string
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const createUserDB = async (userData: {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  subscription_days?: number;
}): Promise<User> => {
  await ensureInitialized();
  
  // Check if user already exists
  const existingUser = await getUserByEmailDB(userData.email);
  if (existingUser) {
    throw new Error('Email já está em uso');
  }

  const newUser = {
    id: generateId(),
    email: userData.email,
    password_hash: userData.password,
    role: userData.role || 'user',
    subscription_days: userData.subscription_days || 0,
    allowed_ips: [],
    is_banned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    db.run(`
      INSERT INTO users (id, email, password_hash, role, subscription_days, allowed_ips, is_banned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newUser.id,
      newUser.email,
      newUser.password_hash,
      newUser.role,
      newUser.subscription_days,
      JSON.stringify(newUser.allowed_ips),
      newUser.is_banned ? 1 : 0,
      newUser.created_at,
      newUser.updated_at
    ]);

    await saveDatabaseToIndexedDB();
    return newUser as User;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Erro ao criar usuário');
  }
};

export const updateUserDB = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  await ensureInitialized();
  try {
    const user = await getUserByIdDB(userId);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString()
    };

    db.run(`
      UPDATE users 
      SET email = ?, password_hash = ?, role = ?, subscription_days = ?, allowed_ips = ?, is_banned = ?, updated_at = ?
      WHERE id = ?
    `, [
      updatedUser.email,
      updatedUser.password_hash,
      updatedUser.role,
      updatedUser.subscription_days,
      JSON.stringify(updatedUser.allowed_ips),
      updatedUser.is_banned ? 1 : 0,
      updatedUser.updated_at,
      userId
    ]);

    await saveDatabaseToIndexedDB();
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
};

export const deleteUserDB = async (userId: string): Promise<void> => {
  await ensureInitialized();
  try {
    db.run('DELETE FROM users WHERE id = ?', [userId]);
    await saveDatabaseToIndexedDB();
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Erro ao deletar usuário');
  }
};

// Session operations
export const getUserSessionDB = async (userId: string): Promise<ProcessingSession | null> => {
  await ensureInitialized();
  try {
    const result = db.exec('SELECT * FROM processing_sessions WHERE user_id = ?', [userId]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0] as string,
      user_id: row[1] as string,
      approved_count: row[2] as number,
      rejected_count: row[3] as number,
      loaded_count: row[4] as number,
      tested_count: row[5] as number,
      is_active: Boolean(row[6]),
      created_at: row[7] as string,
      updated_at: row[8] as string
    };
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
};

export const createSessionDB = async (userId: string): Promise<ProcessingSession> => {
  await ensureInitialized();
  try {
    // Remove existing session for this user
    db.run('DELETE FROM processing_sessions WHERE user_id = ?', [userId]);
    
    const newSession = {
      id: generateId(),
      user_id: userId,
      approved_count: 0,
      rejected_count: 0,
      loaded_count: 0,
      tested_count: 0,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.run(`
      INSERT INTO processing_sessions (id, user_id, approved_count, rejected_count, loaded_count, tested_count, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newSession.id,
      newSession.user_id,
      newSession.approved_count,
      newSession.rejected_count,
      newSession.loaded_count,
      newSession.tested_count,
      newSession.is_active ? 1 : 0,
      newSession.created_at,
      newSession.updated_at
    ]);

    await saveDatabaseToIndexedDB();
    return newSession as ProcessingSession;
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error('Erro ao criar sessão');
  }
};

export const updateSessionDB = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession | null> => {
  await ensureInitialized();
  try {
    const session = await getUserSessionDB(updates.user_id || '');
    if (!session) return null;

    const updatedSession = {
      ...session,
      ...updates,
      updated_at: new Date().toISOString()
    };

    db.run(`
      UPDATE processing_sessions 
      SET approved_count = ?, rejected_count = ?, loaded_count = ?, tested_count = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `, [
      updatedSession.approved_count,
      updatedSession.rejected_count,
      updatedSession.loaded_count,
      updatedSession.tested_count,
      updatedSession.is_active ? 1 : 0,
      updatedSession.updated_at,
      sessionId
    ]);

    await saveDatabaseToIndexedDB();
    return updatedSession;
  } catch (error) {
    console.error('Error updating session:', error);
    return null;
  }
};

// Plan operations
export const getSubscriptionPlansDB = async (): Promise<SubscriptionPlan[]> => {
  await ensureInitialized();
  try {
    const result = db.exec('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC');
    if (result.length === 0) return [];
    
    return result[0].values.map((row: any[]) => ({
      id: row[0] as string,
      name: row[1] as string,
      days: row[2] as number,
      price: row[3] as number,
      description: row[4] as string,
      is_active: Boolean(row[5]),
      created_at: row[6] as string
    }));
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return [];
  }
};

export const getAllSubscriptionPlansDB = async (): Promise<SubscriptionPlan[]> => {
  await ensureInitialized();
  try {
    const result = db.exec('SELECT * FROM subscription_plans ORDER BY created_at DESC');
    if (result.length === 0) return [];
    
    return result[0].values.map((row: any[]) => ({
      id: row[0] as string,
      name: row[1] as string,
      days: row[2] as number,
      price: row[3] as number,
      description: row[4] as string,
      is_active: Boolean(row[5]),
      created_at: row[6] as string
    }));
  } catch (error) {
    console.error('Error getting all subscription plans:', error);
    return [];
  }
};

export const createSubscriptionPlanDB = async (planData: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): Promise<SubscriptionPlan> => {
  await ensureInitialized();
  try {
    const newPlan = {
      id: generateId(),
      name: planData.name,
      days: planData.days,
      price: planData.price,
      description: planData.description || '',
      is_active: true,
      created_at: new Date().toISOString()
    };

    db.run(`
      INSERT INTO subscription_plans (id, name, days, price, description, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      newPlan.id,
      newPlan.name,
      newPlan.days,
      newPlan.price,
      newPlan.description,
      1,
      newPlan.created_at
    ]);

    await saveDatabaseToIndexedDB();
    return newPlan as SubscriptionPlan;
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    throw new Error('Erro ao criar plano');
  }
};

export const updateSubscriptionPlanDB = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> => {
  await ensureInitialized();
  try {
    const result = db.exec('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    const plan = {
      id: row[0] as string,
      name: row[1] as string,
      days: row[2] as number,
      price: row[3] as number,
      description: row[4] as string,
      is_active: Boolean(row[5]),
      created_at: row[6] as string
    };

    const updatedPlan = { ...plan, ...updates };

    db.run(`
      UPDATE subscription_plans 
      SET name = ?, days = ?, price = ?, description = ?, is_active = ?
      WHERE id = ?
    `, [
      updatedPlan.name,
      updatedPlan.days,
      updatedPlan.price,
      updatedPlan.description,
      updatedPlan.is_active ? 1 : 0,
      planId
    ]);

    await saveDatabaseToIndexedDB();
    return updatedPlan;
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return null;
  }
};

export const deleteSubscriptionPlanDB = async (planId: string): Promise<void> => {
  await ensureInitialized();
  try {
    db.run('DELETE FROM subscription_plans WHERE id = ?', [planId]);
    await saveDatabaseToIndexedDB();
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    throw new Error('Erro ao deletar plano');
  }
};

// Purchase operations
export const createPurchaseDB = async (purchaseData: {
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method?: string;
}): Promise<UserPurchase> => {
  await ensureInitialized();
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

    db.run(`
      INSERT INTO user_purchases (id, user_id, plan_id, days_added, amount_paid, payment_method, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      newPurchase.id,
      newPurchase.user_id,
      newPurchase.plan_id,
      newPurchase.days_added,
      newPurchase.amount_paid,
      newPurchase.payment_method,
      newPurchase.created_at
    ]);

    // Update user subscription days
    const user = await getUserByIdDB(purchaseData.user_id);
    if (user) {
      await updateUserDB(user.id, {
        subscription_days: user.subscription_days + purchaseData.days_added
      });
    }

    await saveDatabaseToIndexedDB();
    return newPurchase as UserPurchase;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw new Error('Erro ao criar compra');
  }
};

// Stats
export const getSystemStatsDB = async () => {
  await ensureInitialized();
  try {
    const totalUsersResult = db.exec('SELECT COUNT(*) as count FROM users');
    const activeUsersResult = db.exec('SELECT COUNT(*) as count FROM users WHERE is_banned = 0 AND subscription_days > 0');
    const totalProcessedResult = db.exec('SELECT SUM(tested_count) as total FROM processing_sessions');
    const totalRevenueResult = db.exec('SELECT SUM(amount_paid) as total FROM user_purchases');

    return {
      totalUsers: totalUsersResult[0]?.values[0]?.[0] || 0,
      activeUsers: activeUsersResult[0]?.values[0]?.[0] || 0,
      totalProcessed: totalProcessedResult[0]?.values[0]?.[0] || 0,
      totalRevenue: totalRevenueResult[0]?.values[0]?.[0] || 0
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalProcessed: 0,
      totalRevenue: 0
    };
  }
};

// Save database to IndexedDB for persistence
const saveDatabaseToIndexedDB = async () => {
  if (!db) return;

  try {
    const data = db.export();
    const request = indexedDB.open('TerraMailDB', 1);
    
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('database')) {
        database.createObjectStore('database');
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['database'], 'readwrite');
      const store = transaction.objectStore('database');
      store.put(Array.from(data), 'terramail.db');
    };
  } catch (error) {
    console.error('Error saving database:', error);
  }
};

// Load database from IndexedDB
const loadDatabaseFromIndexedDB = (): Promise<number[] | null> => {
  return new Promise((resolve) => {
    const request = indexedDB.open('TerraMailDB', 1);
    
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('database')) {
        database.createObjectStore('database');
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['database'], 'readonly');
      const store = transaction.objectStore('database');
      const getRequest = store.get('terramail.db');
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      
      getRequest.onerror = () => {
        resolve(null);
      };
    };

    request.onerror = () => {
      resolve(null);
    };
  });
};

// Initialize database
const initializeSQLite = async () => {
  if (isInitialized) return;

  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });

    // Try to load existing database
    let data: Uint8Array | undefined;
    try {
      const savedData = await loadDatabaseFromIndexedDB();
      if (savedData) {
        data = new Uint8Array(savedData);
      }
    } catch (error) {
      console.log('Creating new database');
    }

    db = new SQL.Database(data);
    
    createTables();
    
    // Check if we need to initialize default data
    const userCountResult = db.exec('SELECT COUNT(*) as count FROM users');
    const userCount = userCountResult[0]?.values[0]?.[0] || 0;
    
    if (userCount === 0) {
      initializeDefaultData();
    }

    isInitialized = true;
    console.log('✅ SQLite database initialized successfully');

    // Auto-save every 5 seconds
    setInterval(saveDatabaseToIndexedDB, 5000);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

// Export initialization function
export const initDatabase = initializeSQLite;

// Auto-initialize
initializeSQLite();