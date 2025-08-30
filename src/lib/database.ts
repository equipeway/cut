// Simple JSON file database that works directly in the browser
export interface User {
  id: string;
  email: string;
  password: string; // In production, this should be hashed
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

export interface Database {
  users: User[];
  processing_sessions: ProcessingSession[];
  subscription_plans: SubscriptionPlan[];
  user_purchases: UserPurchase[];
  login_attempts: any[];
}

// Default database structure
const defaultDatabase: Database = {
  users: [
    {
      id: 'admin-001',
      email: 'admin@terramail.com',
      password: 'admin123',
      role: 'admin',
      subscription_days: 9999,
      allowed_ips: [],
      is_banned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  processing_sessions: [],
  subscription_plans: [
    {
      id: 'plan-001',
      name: 'Plano Básico',
      days: 30,
      price: 29.90,
      description: 'Ideal para iniciantes com recursos essenciais',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'plan-002',
      name: 'Plano Standard',
      days: 90,
      price: 79.90,
      description: 'Perfeito para uso regular com recursos avançados',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'plan-003',
      name: 'Plano Premium',
      days: 180,
      price: 149.90,
      description: 'Para usuários intensivos com máxima performance',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'plan-004',
      name: 'Plano Ultimate',
      days: 365,
      price: 299.90,
      description: 'Acesso completo por um ano inteiro',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ],
  user_purchases: [],
  login_attempts: []
};

// Storage key
const STORAGE_KEY = 'terramail_database';

// Helper functions
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Database operations
export const getDatabase = (): Database => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with default data
    saveDatabase(defaultDatabase);
    return defaultDatabase;
  } catch (error) {
    console.error('Error loading database:', error);
    return defaultDatabase;
  }
};

export const saveDatabase = (db: Database): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error saving database:', error);
  }
};

// User operations
export const getUserByEmail = (email: string): User | null => {
  const db = getDatabase();
  return db.users.find(user => user.email === email) || null;
};

export const getUserById = (id: string): User | null => {
  const db = getDatabase();
  return db.users.find(user => user.id === id) || null;
};

export const getUsers = (): User[] => {
  const db = getDatabase();
  return db.users;
};

export const createUser = (userData: {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  subscription_days?: number;
}): User => {
  const db = getDatabase();
  
  // Check if user already exists
  if (getUserByEmail(userData.email)) {
    throw new Error('Email já está em uso');
  }

  const newUser: User = {
    id: generateId(),
    email: userData.email,
    password: userData.password, // In production, hash this
    role: userData.role || 'user',
    subscription_days: userData.subscription_days || 0,
    allowed_ips: [],
    is_banned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDatabase(db);
  return newUser;
};

export const updateUser = (userId: string, updates: Partial<User>): User | null => {
  const db = getDatabase();
  const userIndex = db.users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    return null;
  }

  db.users[userIndex] = {
    ...db.users[userIndex],
    ...updates,
    updated_at: new Date().toISOString()
  };

  saveDatabase(db);
  return db.users[userIndex];
};

export const deleteUser = (userId: string): void => {
  const db = getDatabase();
  db.users = db.users.filter(user => user.id !== userId);
  
  // Also remove related data
  db.processing_sessions = db.processing_sessions.filter(session => session.user_id !== userId);
  db.user_purchases = db.user_purchases.filter(purchase => purchase.user_id !== userId);
  
  saveDatabase(db);
};

// Session operations
export const getUserSession = (userId: string): ProcessingSession | null => {
  const db = getDatabase();
  return db.processing_sessions.find(session => session.user_id === userId) || null;
};

export const createSession = (userId: string): ProcessingSession => {
  const db = getDatabase();
  
  // Remove existing session for this user
  db.processing_sessions = db.processing_sessions.filter(session => session.user_id !== userId);
  
  const newSession: ProcessingSession = {
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

  db.processing_sessions.push(newSession);
  saveDatabase(db);
  return newSession;
};

export const updateSession = (sessionId: string, updates: Partial<ProcessingSession>): ProcessingSession | null => {
  const db = getDatabase();
  const sessionIndex = db.processing_sessions.findIndex(session => session.id === sessionId);
  
  if (sessionIndex === -1) {
    return null;
  }

  db.processing_sessions[sessionIndex] = {
    ...db.processing_sessions[sessionIndex],
    ...updates,
    updated_at: new Date().toISOString()
  };

  saveDatabase(db);
  return db.processing_sessions[sessionIndex];
};

// Plan operations
export const getSubscriptionPlans = (): SubscriptionPlan[] => {
  const db = getDatabase();
  return db.subscription_plans.filter(plan => plan.is_active);
};

export const getAllSubscriptionPlans = (): SubscriptionPlan[] => {
  const db = getDatabase();
  return db.subscription_plans;
};

export const createSubscriptionPlan = (planData: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): SubscriptionPlan => {
  const db = getDatabase();
  
  const newPlan: SubscriptionPlan = {
    id: generateId(),
    name: planData.name,
    days: planData.days,
    price: planData.price,
    description: planData.description || '',
    is_active: true,
    created_at: new Date().toISOString()
  };

  db.subscription_plans.push(newPlan);
  saveDatabase(db);
  return newPlan;
};

export const updateSubscriptionPlan = (planId: string, updates: Partial<SubscriptionPlan>): SubscriptionPlan | null => {
  const db = getDatabase();
  const planIndex = db.subscription_plans.findIndex(plan => plan.id === planId);
  
  if (planIndex === -1) {
    return null;
  }

  db.subscription_plans[planIndex] = {
    ...db.subscription_plans[planIndex],
    ...updates
  };

  saveDatabase(db);
  return db.subscription_plans[planIndex];
};

export const deleteSubscriptionPlan = (planId: string): void => {
  const db = getDatabase();
  db.subscription_plans = db.subscription_plans.filter(plan => plan.id !== planId);
  saveDatabase(db);
};

// Purchase operations
export const createPurchase = (purchaseData: {
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method?: string;
}): UserPurchase => {
  const db = getDatabase();
  
  const newPurchase: UserPurchase = {
    id: generateId(),
    user_id: purchaseData.user_id,
    plan_id: purchaseData.plan_id,
    days_added: purchaseData.days_added,
    amount_paid: purchaseData.amount_paid,
    payment_method: purchaseData.payment_method || 'manual',
    created_at: new Date().toISOString()
  };

  db.user_purchases.push(newPurchase);
  
  // Update user subscription days
  const user = getUserById(purchaseData.user_id);
  if (user) {
    updateUser(user.id, {
      subscription_days: user.subscription_days + purchaseData.days_added
    });
  }

  saveDatabase(db);
  return newPurchase;
};

// Stats
export const getSystemStats = () => {
  const db = getDatabase();
  
  const totalUsers = db.users.length;
  const activeUsers = db.users.filter(user => !user.is_banned && user.subscription_days > 0).length;
  const bannedUsers = db.users.filter(user => user.is_banned).length;
  const adminUsers = db.users.filter(user => user.role === 'admin').length;
  
  const totalProcessed = db.processing_sessions.reduce((sum, session) => sum + session.tested_count, 0);
  const totalApproved = db.processing_sessions.reduce((sum, session) => sum + session.approved_count, 0);
  const totalRevenue = db.user_purchases.reduce((sum, purchase) => sum + purchase.amount_paid, 0);
  
  // Monthly revenue (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthlyRevenue = db.user_purchases
    .filter(purchase => new Date(purchase.created_at) > thirtyDaysAgo)
    .reduce((sum, purchase) => sum + purchase.amount_paid, 0);

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
};

// Initialize database
export const initDatabase = (): void => {
  const db = getDatabase();
  console.log('✅ Database initialized with', db.users.length, 'users and', db.subscription_plans.length, 'plans');
};