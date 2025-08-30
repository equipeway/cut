import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'server', 'database.json');

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

interface Database {
  users: User[];
  login_attempts: LoginAttempt[];
  processing_sessions: ProcessingSession[];
  subscription_plans: SubscriptionPlan[];
  user_purchases: UserPurchase[];
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

// Read database
const readDatabase = async (): Promise<Database> => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    throw new Error('Failed to read database');
  }
};

// Write database
const writeDatabase = async (db: Database): Promise<void> => {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
    throw new Error('Failed to write database');
  }
};

// User operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const db = await readDatabase();
    const user = db.users.find(u => u.email === email);
    return user || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const db = await readDatabase();
    const user = db.users.find(u => u.id === id);
    return user || null;
  } catch (error) {
    console.error('Error fetching user by id:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const db = await readDatabase();
    return db.users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    const db = await readDatabase();
    
    // Check if user already exists
    const existingUser = db.users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('Email já está em uso');
    }

    // Hash password
    const password_hash = await bcrypt.hash(userData.password, 10);

    const newUser: User = {
      id: generateId(),
      email: userData.email,
      password_hash,
      role: userData.role || 'user',
      subscription_days: userData.subscription_days || 0,
      allowed_ips: userData.allowed_ips || [],
      is_banned: false,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    };

    db.users.push(newUser);
    await writeDatabase(db);
    
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  try {
    const db = await readDatabase();
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return null;
    }

    const updatedUser = {
      ...db.users[userIndex],
      ...updates,
      updated_at: getCurrentTimestamp()
    };

    db.users[userIndex] = updatedUser;
    await writeDatabase(db);
    
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const db = await readDatabase();
    db.users = db.users.filter(u => u.id !== userId);
    
    // Also remove related data
    db.processing_sessions = db.processing_sessions.filter(s => s.user_id !== userId);
    db.user_purchases = db.user_purchases.filter(p => p.user_id !== userId);
    
    await writeDatabase(db);
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
    const db = await readDatabase();
    const sessions = db.processing_sessions
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return sessions[0] || null;
  } catch (error) {
    console.error('Error fetching user session:', error);
    throw error;
  }
};

export const createSession = async (userId: string): Promise<ProcessingSession> => {
  try {
    const db = await readDatabase();
    
    const newSession: ProcessingSession = {
      id: generateId(),
      user_id: userId,
      approved_count: 0,
      rejected_count: 0,
      loaded_count: 0,
      tested_count: 0,
      is_active: false,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    };

    db.processing_sessions.push(newSession);
    await writeDatabase(db);
    
    return newSession;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession> => {
  try {
    const db = await readDatabase();
    const sessionIndex = db.processing_sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error('Session not found');
    }

    const updatedSession = {
      ...db.processing_sessions[sessionIndex],
      ...updates,
      updated_at: getCurrentTimestamp()
    };

    db.processing_sessions[sessionIndex] = updatedSession;
    await writeDatabase(db);
    
    return updatedSession;
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

// Subscription plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const db = await readDatabase();
    return db.subscription_plans
      .filter(p => p.is_active)
      .sort((a, b) => a.price - b.price);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
};

export const getAllSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const db = await readDatabase();
    return db.subscription_plans.sort((a, b) => a.price - b.price);
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
    const db = await readDatabase();
    
    const newPlan: SubscriptionPlan = {
      id: generateId(),
      name: plan.name,
      days: plan.days,
      price: plan.price,
      description: plan.description || '',
      is_active: true,
      created_at: getCurrentTimestamp()
    };

    db.subscription_plans.push(newPlan);
    await writeDatabase(db);
    
    return newPlan;
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    throw error;
  }
};

export const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> => {
  try {
    const db = await readDatabase();
    const planIndex = db.subscription_plans.findIndex(p => p.id === planId);
    
    if (planIndex === -1) {
      return null;
    }

    const updatedPlan = {
      ...db.subscription_plans[planIndex],
      ...updates
    };

    db.subscription_plans[planIndex] = updatedPlan;
    await writeDatabase(db);
    
    return updatedPlan;
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    throw error;
  }
};

export const deleteSubscriptionPlan = async (planId: string): Promise<void> => {
  try {
    const db = await readDatabase();
    db.subscription_plans = db.subscription_plans.filter(p => p.id !== planId);
    await writeDatabase(db);
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    throw error;
  }
};

// User purchases
export const getUserPurchases = async (userId: string): Promise<UserPurchase[]> => {
  try {
    const db = await readDatabase();
    return db.user_purchases
      .filter(p => p.user_id === userId)
      .map(purchase => {
        const plan = db.subscription_plans.find(p => p.id === purchase.plan_id);
        return {
          ...purchase,
          plan
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    const db = await readDatabase();
    
    const newPurchase: UserPurchase = {
      id: generateId(),
      user_id: purchase.user_id,
      plan_id: purchase.plan_id,
      days_added: purchase.days_added,
      amount_paid: purchase.amount_paid,
      payment_method: purchase.payment_method || 'manual',
      created_at: getCurrentTimestamp()
    };

    db.user_purchases.push(newPurchase);
    
    // Update user subscription days
    const userIndex = db.users.findIndex(u => u.id === purchase.user_id);
    if (userIndex !== -1) {
      db.users[userIndex].subscription_days += purchase.days_added;
      db.users[userIndex].updated_at = getCurrentTimestamp();
    }
    
    await writeDatabase(db);
    return newPurchase;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
};

// Analytics
export const getSystemStats = async () => {
  try {
    const db = await readDatabase();
    
    const totalUsers = db.users.length;
    const adminUsers = db.users.filter(u => u.role === 'admin').length;
    const bannedUsers = db.users.filter(u => u.is_banned).length;
    const activeUsers = db.users.filter(u => !u.is_banned && u.subscription_days > 0).length;
    
    const totalProcessed = db.processing_sessions.reduce((sum, s) => sum + s.tested_count, 0);
    const totalApproved = db.processing_sessions.reduce((sum, s) => sum + s.approved_count, 0);
    
    const totalRevenue = db.user_purchases.reduce((sum, p) => sum + p.amount_paid, 0);
    
    // Monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyRevenue = db.user_purchases
      .filter(p => new Date(p.created_at) > thirtyDaysAgo)
      .reduce((sum, p) => sum + p.amount_paid, 0);

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
  try {
    const db = await readDatabase();
    
    const loginAttempt: LoginAttempt = {
      id: generateId(),
      ip_address: ipAddress,
      user_email: userEmail,
      success,
      created_at: getCurrentTimestamp()
    };

    db.login_attempts.push(loginAttempt);
    
    // Keep only last 1000 login attempts to prevent file bloat
    if (db.login_attempts.length > 1000) {
      db.login_attempts = db.login_attempts
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 1000);
    }
    
    await writeDatabase(db);
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
};

// Check if IP is banned
export const isIPBanned = async (ipAddress: string): Promise<boolean> => {
  try {
    const db = await readDatabase();
    const recentAttempts = db.login_attempts
      .filter(attempt => 
        attempt.ip_address === ipAddress && 
        !attempt.success &&
        new Date(attempt.created_at) > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
      );
    
    // Ban if more than 5 failed attempts in 15 minutes
    return recentAttempts.length >= 5;
  } catch (error) {
    console.error('Error checking banned IP:', error);
    return false;
  }
};