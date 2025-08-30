import { supabase, isSupabaseConfigured } from './supabase';
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

// Dados hardcoded para funcionamento offline
const HARDCODED_USERS: User[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@terramail.com',
    password_hash: 'admin123',
    role: 'admin',
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
    role: 'user',
    subscription_days: 30,
    allowed_ips: [],
    is_banned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let mockUsers = [...HARDCODED_USERS];
let mockSessions: ProcessingSession[] = [];
let mockPlans: SubscriptionPlan[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010', 
    name: 'Plano Básico',
    days: 7,
    price: 9.90,
    description: 'Ideal para testes e uso básico',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Plano Standard',
    days: 30,
    price: 29.90,
    description: 'Perfeito para uso regular',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'Plano Premium',
    days: 90,
    price: 79.90,
    description: 'Melhor custo-benefício',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    name: 'Plano Ultimate',
    days: 365,
    price: 299.90,
    description: 'Acesso completo por 1 ano',
    is_active: true,
    created_at: new Date().toISOString()
  }
];
let mockPurchases: UserPurchase[] = [];

// User operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Supabase error:', error);
      return null;
    }
  } else {
    // Fallback para dados mock
    const user = mockUsers.find(u => u.email === email);
    return user || null;
  }
};

export const getUsers = async (): Promise<User[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Supabase error:', error);
      // Fallback para dados mock em caso de erro
      return mockUsers;
    }
  } else {
    return mockUsers;
  }
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
      // Hash da senha
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const { data, error } = await supabase
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
      console.error('Supabase error:', error);
      throw error;
    }
  } else {
    // Fallback para dados mock
    const newUser: User = {
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
    
    mockUsers.push(newUser);
    return newUser;
  }
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
      
      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Supabase error:', error);
      throw error;
    }
  } else {
    // Fallback para dados mock
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates, updated_at: new Date().toISOString() };
      return mockUsers[userIndex];
    }
    throw new Error('Usuário não encontrado');
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
    } catch (error) {
      console.error('Supabase error:', error);
      throw error;
    }
  } else {
    // Fallback para dados mock
    mockUsers = mockUsers.filter(u => u.id !== userId);
  }
};

// Processing sessions
export const getUserSession = async (userId: string): Promise<ProcessingSession | null> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('processing_sessions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No session found - this is expected for new users
          return null;
        }
        console.error('Error fetching session:', error);
        return null;
      }
      
      return data || null;
    } catch (error) {
      console.error('Supabase error:', error);
      return null;
    }
  } else {
    const session = mockSessions.find(s => s.user_id === userId);
    return session || null;
  }
};

export const createSession = async (userId: string): Promise<ProcessingSession> => {
  if (isSupabaseConfigured()) {
    try {
      // Ensure we have a valid user ID
      if (!userId) {
        throw new Error('User ID is required to create session');
      }

      const { data, error } = await supabase
        .from('processing_sessions')
        .insert({
          user_id: userId
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating session:', error);
        console.error('Error details:', error.message, error.code);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Supabase error:', error);
      throw error;
    }
  } else {
    // Fallback para dados mock
    const newSession: ProcessingSession = {
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
    
    mockSessions.push(newSession);
    return newSession;
  }
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession> => {
  if (isSupabaseConfigured()) {
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
      console.error('Supabase error:', error);
      throw error;
    }
  } else {
    // Fallback para dados mock
    const sessionIndex = mockSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      mockSessions[sessionIndex] = { 
        ...mockSessions[sessionIndex], 
        ...updates, 
        updated_at: new Date().toISOString() 
      };
      return mockSessions[sessionIndex];
    }
    
    // Se não encontrar, criar nova sessão
    const newSession: ProcessingSession = {
      id: sessionId,
      user_id: updates.user_id || '',
      approved_count: updates.approved_count || 0,
      rejected_count: updates.rejected_count || 0,
      loaded_count: updates.loaded_count || 0,
      tested_count: updates.tested_count || 0,
      is_active: updates.is_active || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockSessions.push(newSession);
    return newSession;
  }
};

// Subscription plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) {
        console.error('Error fetching plans:', error);
        return mockPlans;
      }
      
      return data || mockPlans;
    } catch (error) {
      console.error('Supabase error:', error);
      return mockPlans;
    }
  } else {
    return mockPlans;
  }
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
        .insert({
          name: plan.name,
          days: plan.days,
          price: plan.price,
          description: plan.description || ''
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating plan:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Supabase error:', error);
      throw error;
    }
  } else {
    // Fallback para dados mock
    const newPlan: SubscriptionPlan = {
      id: crypto.randomUUID(),
      ...plan,
      description: plan.description || '',
      is_active: true,
      created_at: new Date().toISOString()
    };
    
    mockPlans.push(newPlan);
    return newPlan;
  }
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
      
      if (error) {
        console.error('Error updating plan:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Supabase error:', error);
      throw error;
    }
  } else {
    // Fallback para dados mock
    const planIndex = mockPlans.findIndex(p => p.id === planId);
    if (planIndex !== -1) {
      mockPlans[planIndex] = { ...mockPlans[planIndex], ...updates };
      return mockPlans[planIndex];
    }
    throw new Error('Plano não encontrado');
  }
};

// User purchases
export const getUserPurchases = async (userId: string): Promise<UserPurchase[]> => {
  if (isSupabaseConfigured()) {
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
        console.error('Error fetching purchases:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Supabase error:', error);
      return [];
    }
  } else {
    return mockPurchases.filter(p => p.user_id === userId);
  }
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
      console.error('Supabase error:', error);
      throw error;
    }
  } else {
    // Fallback para dados mock
    const newPurchase: UserPurchase = {
      id: crypto.randomUUID(),
      ...purchase,
      payment_method: purchase.payment_method || 'manual',
      created_at: new Date().toISOString()
    };
    
    mockPurchases.push(newPurchase);
    return newPurchase;
  }
};

// Analytics
export const getSystemStats = async () => {
  if (isSupabaseConfigured()) {
    try {
      // Buscar dados reais do Supabase
      const [usersData, sessionsData, purchasesData] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('processing_sessions').select('*'),
        supabase.from('user_purchases').select('*')
      ]);
      
      const users = usersData.data || [];
      const sessions = sessionsData.data || [];
      const purchases = purchasesData.data || [];
      
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
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback para dados mock
      return {
        totalUsers: mockUsers.length,
        activeUsers: mockUsers.filter(u => !u.is_banned && u.subscription_days > 0).length,
        bannedUsers: mockUsers.filter(u => u.is_banned).length,
        adminUsers: mockUsers.filter(u => u.role === 'admin').length,
        totalProcessed: mockSessions.reduce((sum, s) => sum + s.tested_count, 0),
        totalApproved: mockSessions.reduce((sum, s) => sum + s.approved_count, 0),
        totalRevenue: mockPurchases.reduce((sum, p) => sum + Number(p.amount_paid), 0),
        monthlyRevenue: mockPurchases
          .filter(p => new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .reduce((sum, p) => sum + Number(p.amount_paid), 0)
      };
    }
  } else {
    // Dados mock quando Supabase não está configurado
    return {
      totalUsers: mockUsers.length,
      activeUsers: mockUsers.filter(u => !u.is_banned && u.subscription_days > 0).length,
      bannedUsers: mockUsers.filter(u => u.is_banned).length,
      adminUsers: mockUsers.filter(u => u.role === 'admin').length,
      totalProcessed: mockSessions.reduce((sum, s) => sum + s.tested_count, 0),
      totalApproved: mockSessions.reduce((sum, s) => sum + s.approved_count, 0),
      totalRevenue: mockPurchases.reduce((sum, p) => sum + Number(p.amount_paid), 0),
      monthlyRevenue: mockPurchases
        .filter(p => new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, p) => sum + Number(p.amount_paid), 0)
    };
  }
};