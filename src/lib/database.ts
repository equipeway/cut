import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase';
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
export const getUserByEmail = async (email: string): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  console.log('getUserByEmail - Searching for email:', email);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    console.log('getUserByEmail - Supabase response:', { data, error });

    if (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }

    console.log('getUserByEmail - Found user:', data ? 'Yes' : 'No');
    return data;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado. Verifique as chaves da API no arquivo .env');
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      if (error.message?.includes('Invalid API key')) {
        throw new Error('Chaves da API do Supabase inválidas. Verifique VITE_SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
      }
      throw error;
    }

    return data || [];
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
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    console.log('Creating user with password:', userData.password);
    
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(userData.password, 10);
      console.log('Password hashed successfully:', hashedPassword);
    } catch (hashError) {
      console.error('Error hashing password:', hashError);
      // Fallback to plain text if hashing fails
      hashedPassword = userData.password;
      console.log('Using plain text password as fallback');
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: userData.email,
        password_hash: hashedPassword,
        role: userData.role || 'user',
        subscription_days: userData.subscription_days || 0,
        allowed_ips: userData.allowed_ips || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw error;
  }
};

// Processing sessions
export const getUserSession = async (userId: string): Promise<ProcessingSession | null> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { data, error } = await supabase
      .from('processing_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching user session:', error);
      throw error;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in getUserSession:', error);
    throw error;
  }
};

export const createSession = async (userId: string): Promise<ProcessingSession> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { data, error } = await supabase
      .from('processing_sessions')
      .insert({
        user_id: userId,
        approved_count: 0,
        rejected_count: 0,
        loaded_count: 0,
        tested_count: 0,
        is_active: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createSession:', error);
    throw error;
  }
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { data, error } = await supabase
      .from('processing_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateSession:', error);
    throw error;
  }
};

// Subscription plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }

    return data || [];
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
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        name: plan.name,
        days: plan.days,
        price: plan.price,
        description: plan.description || '',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription plan:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createSubscriptionPlan:', error);
    throw error;
  }
};

export const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription plan:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateSubscriptionPlan:', error);
    throw error;
  }
};

// User purchases
export const getUserPurchases = async (userId: string): Promise<UserPurchase[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { data, error } = await supabase
      .from('user_purchases')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user purchases:', error);
      throw error;
    }

    return data || [];
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
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    const { data, error } = await supabase
      .from('user_purchases')
      .insert({
        user_id: purchase.user_id,
        plan_id: purchase.plan_id,
        days_added: purchase.days_added,
        amount_paid: purchase.amount_paid,
        payment_method: purchase.payment_method || 'manual'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating purchase:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createPurchase:', error);
    throw error;
  }
};

// Analytics
export const getSystemStats = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please connect to Supabase to use this feature.');
  }

  try {
    // Get user stats
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('role, is_banned, subscription_days');

    if (usersError) throw usersError;

    // Get processing stats
    const { data: sessions, error: sessionsError } = await supabase
      .from('processing_sessions')
      .select('approved_count, rejected_count, tested_count');

    if (sessionsError) throw sessionsError;

    // Get purchase stats
    const { data: purchases, error: purchasesError } = await supabase
      .from('user_purchases')
      .select('amount_paid, created_at');

    if (purchasesError) throw purchasesError;

    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter(u => !u.is_banned && u.subscription_days > 0).length || 0;
    const bannedUsers = users?.filter(u => u.is_banned).length || 0;
    const adminUsers = users?.filter(u => u.role === 'admin').length || 0;

    const totalProcessed = sessions?.reduce((sum, s) => sum + s.tested_count, 0) || 0;
    const totalApproved = sessions?.reduce((sum, s) => sum + s.approved_count, 0) || 0;

    const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyRevenue = purchases?.filter(p => new Date(p.created_at) > thirtyDaysAgo)
      .reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;

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
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, skipping login attempt logging');
    return;
  }

  try {
    const { error } = await supabase
      .from('login_attempts')
      .insert({
        ip_address: ipAddress,
        user_email: userEmail,
        success
      });

    if (error) {
      console.error('Error logging login attempt:', error);
    }
  } catch (error) {
    console.error('Error in logLoginAttempt:', error);
  }
};

// Check if IP is banned
export const isIPBanned = async (ipAddress: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('banned_ips')
      .select('banned_until')
      .eq('ip_address', ipAddress)
      .maybeSingle();

    if (error) {
      console.error('Error checking banned IP:', error);
      return false;
    }

    if (!data) return false;

    // Check if ban is still active
    if (data.banned_until) {
      const banExpiry = new Date(data.banned_until);
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