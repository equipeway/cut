import { supabase } from './supabase';
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

// User operations
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const createUser = async (userData: {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  subscription_days?: number;
  allowed_ips?: string[];
}): Promise<User> => {
  const passwordHash = await bcrypt.hash(userData.password, 10);
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: userData.email,
      password_hash: passwordHash,
      role: userData.role || 'user',
      subscription_days: userData.subscription_days || 0,
      allowed_ips: userData.allowed_ips || []
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteUser = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);
  
  if (error) throw error;
};

// Authentication
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Login attempts
export const getLoginAttempts = async (): Promise<LoginAttempt[]> => {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) throw error;
  return data || [];
};

export const addLoginAttempt = async (attempt: {
  ip_address: string;
  user_email?: string;
  success: boolean;
}): Promise<void> => {
  const { error } = await supabase
    .from('login_attempts')
    .insert(attempt);
  
  if (error) throw error;
};

export const getRecentFailedAttempts = async (ipAddress: string, hoursAgo: number = 1): Promise<LoginAttempt[]> => {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('ip_address', ipAddress)
    .eq('success', false)
    .gte('created_at', cutoff);
  
  if (error) throw error;
  return data || [];
};

// Banned IPs
export const getBannedIPs = async (): Promise<BannedIP[]> => {
  const { data, error } = await supabase
    .from('banned_ips')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const isIPBanned = async (ipAddress: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('banned_ips')
    .select('*')
    .eq('ip_address', ipAddress)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return false;
  
  if (!data.banned_until) return true;
  return new Date(data.banned_until) > new Date();
};

export const banIP = async (ipAddress: string, reason: string = 'Violation of terms', hours: number = 24): Promise<void> => {
  const bannedUntil = hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null;
  
  const { error } = await supabase
    .from('banned_ips')
    .upsert({
      ip_address: ipAddress,
      reason,
      banned_until: bannedUntil
    });
  
  if (error) throw error;
};

export const unbanIP = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('banned_ips')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Processing sessions
export const getUserSession = async (userId: string): Promise<ProcessingSession | null> => {
  const { data, error } = await supabase
    .from('processing_sessions')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const createSession = async (userId: string): Promise<ProcessingSession> => {
  const { data, error } = await supabase
    .from('processing_sessions')
    .insert({ user_id: userId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession> => {
  const { data, error } = await supabase
    .from('processing_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Subscription plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const createSubscriptionPlan = async (plan: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): Promise<SubscriptionPlan> => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(plan)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// User purchases
export const getUserPurchases = async (userId: string): Promise<UserPurchase[]> => {
  const { data, error } = await supabase
    .from('user_purchases')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createPurchase = async (purchase: {
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method?: string;
}): Promise<UserPurchase> => {
  const { data, error } = await supabase
    .from('user_purchases')
    .insert(purchase)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Analytics
export const getSystemStats = async () => {
  const [usersResult, sessionsResult, purchasesResult] = await Promise.all([
    supabase.from('users').select('id, role, subscription_days, is_banned'),
    supabase.from('processing_sessions').select('approved_count, rejected_count, tested_count'),
    supabase.from('user_purchases').select('amount_paid, created_at')
  ]);

  const users = usersResult.data || [];
  const sessions = sessionsResult.data || [];
  const purchases = purchasesResult.data || [];

  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => !u.is_banned && u.subscription_days > 0).length,
    bannedUsers: users.filter(u => u.is_banned).length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    totalProcessed: sessions.reduce((sum, s) => sum + s.tested_count, 0),
    totalApproved: sessions.reduce((sum, s) => sum + s.approved_count, 0),
    totalRevenue: purchases.reduce((sum, p) => sum + Number(p.amount_paid), 0),
    monthlyRevenue: purchases
      .filter(p => new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, p) => sum + Number(p.amount_paid), 0)
  };
};