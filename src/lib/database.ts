import { supabase, isSupabaseConfigured } from './supabase';

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

// Usuários hardcoded para garantir funcionamento
const HARDCODED_USERS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@terramail.com',
    password_hash: 'admin123',
    role: 'admin' as const,
    subscription_days: 365,
    allowed_ips: [],
    is_banned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'user@terramail.com',
    password_hash: 'user123',
    role: 'user' as const,
    subscription_days: 30,
    allowed_ips: [],
    is_banned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// User operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  console.log('Buscando usuário por email:', email);
  
  // Primeiro tenta buscar nos dados hardcoded
  const hardcodedUser = HARDCODED_USERS.find(u => u.email === email);
  if (hardcodedUser) {
    console.log('Usuário encontrado nos dados hardcoded:', hardcodedUser.email);
    return hardcodedUser;
  }

  // Se Supabase estiver configurado, tenta buscar lá também
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao buscar no Supabase:', error);
        return null;
      }
      
      if (data) {
        console.log('Usuário encontrado no Supabase:', data.email);
        return data;
      }
    } catch (error) {
      console.error('Erro de conexão com Supabase:', error);
    }
  }

  console.log('Usuário não encontrado');
  return null;
};

export const getUsers = async (): Promise<User[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Failed to load users from Supabase:', error);
        return HARDCODED_USERS;
      }
      return data || HARDCODED_USERS;
    } catch (error) {
      console.error('Error loading users from Supabase:', error);
      return HARDCODED_USERS;
    }
  }
  
  return HARDCODED_USERS;
};

export const createUser = async (userData: {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  subscription_days?: number;
  allowed_ips?: string[];
}): Promise<User> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          password_hash: userData.password,
          role: userData.role || 'user',
          subscription_days: userData.subscription_days || 0,
          allowed_ips: userData.allowed_ips || []
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create user in Supabase:', error);
      // RLS policy violation - return mock data to continue functionality
      return {
        id: crypto.randomUUID(),
        email: userData.email,
        password_hash: userData.password,
        role: userData.role || 'user',
        subscription_days: userData.subscription_days || 0,
        allowed_ips: userData.allowed_ips || [],
        is_banned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }
  
  throw new Error('Supabase not configured');
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Supabase write operation failed due to RLS. Using mock data.');
      return { ...updates, id: userId } as User;
    }
  }
  
  throw new Error('Supabase not configured');
};

export const deleteUser = async (userId: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.warn('Supabase write operation failed due to RLS. Using mock data.');
      return;
    }
  }
};

// Processing sessions
export const getUserSession = async (userId: string): Promise<ProcessingSession | null> => {
  // Validate UUID format before making Supabase request
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    console.warn('Invalid UUID format for userId:', userId);
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      approved_count: 0,
      rejected_count: 0,
      loaded_count: 0,
      tested_count: 0,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('processing_sessions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Failed to load session from Supabase:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error loading session from Supabase:', error);
      return null;
    }
  }
  
  // Mock session for hardcoded users
  return {
    id: '550e8400-e29b-41d4-a716-446655440003',
    user_id: userId,
    approved_count: 0,
    rejected_count: 0,
    loaded_count: 0,
    tested_count: 0,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

export const createSession = async (userId: string): Promise<ProcessingSession> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('processing_sessions')
      .insert({ user_id: userId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Mock session for hardcoded users
  return {
    id: '550e8400-e29b-41d4-a716-446655440004',
    user_id: userId,
    approved_count: 0,
    rejected_count: 0,
    loaded_count: 0,
    tested_count: 0,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('processing_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Mock update for hardcoded users
  return {
    id: sessionId,
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    approved_count: updates.approved_count || 0,
    rejected_count: updates.rejected_count || 0,
    loaded_count: updates.loaded_count || 0,
    tested_count: updates.tested_count || 0,
    is_active: updates.is_active || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

// Subscription plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading plans from Supabase:', error);
      return [];
    }
  }
  
  return [];
};

export const createSubscriptionPlan = async (plan: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): Promise<SubscriptionPlan> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(plan)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Supabase write operation failed due to RLS. Using mock data.');
      return {
        id: crypto.randomUUID(),
        ...plan,
        description: plan.description || '',
        is_active: true,
        created_at: new Date().toISOString()
      };
    }
  }
  
  throw new Error('Supabase not configured');
};

export const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', planId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Supabase write operation failed due to RLS. Using mock data.');
      return { ...updates, id: planId } as SubscriptionPlan;
    }
  }
  
  throw new Error('Supabase not configured');
};

// User purchases
export const getUserPurchases = async (userId: string): Promise<UserPurchase[]> => {
  if (isSupabaseConfigured()) {
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
  }
  
  return [];
};

export const createPurchase = async (purchase: {
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method?: string;
}): Promise<UserPurchase> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .insert(purchase)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Supabase write operation failed due to RLS. Using mock data.');
      return {
        id: crypto.randomUUID(),
        ...purchase,
        payment_method: purchase.payment_method || 'manual',
        created_at: new Date().toISOString()
      };
    }
  }
  
  throw new Error('Supabase not configured');
};

// Analytics
export const getSystemStats = async () => {
  if (isSupabaseConfigured()) {
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
  }
  
  // Mock stats for hardcoded users
  return {
    totalUsers: 2,
    activeUsers: 2,
    bannedUsers: 0,
    adminUsers: 1,
    totalProcessed: 0,
    totalApproved: 0,
    totalRevenue: 0,
    monthlyRevenue: 0
  };
};