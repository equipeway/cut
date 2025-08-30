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
  console.log('Buscando usuário por email:', email);
  
  // Sempre usar dados hardcoded
  const user = mockUsers.find(u => u.email === email);
  if (user) {
    console.log('Usuário encontrado:', user.email);
    return user;
  }

  console.log('Usuário não encontrado');
  return null;
};

export const getUsers = async (): Promise<User[]> => {
  console.log('Buscando usuários...');
  
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários do Supabase:', error);
        console.log('Usando dados mock como fallback');
        return mockUsers;
      }

      console.log('Usuários carregados do Supabase:', data?.length);
      return data as User[];
    } catch (error) {
      console.error('Erro na conexão com Supabase:', error);
      console.log('Usando dados mock como fallback');
      return mockUsers;
    }
  }
  
  console.log('Supabase não configurado, retornando dados mock');
  return mockUsers;
};

export const createUser = async (userData: {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  subscription_days?: number;
  allowed_ips?: string[];
}): Promise<User> => {
  console.log('Criando usuário:', userData.email);
  
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          password_hash: userData.password, // In production, hash this properly
          role: userData.role || 'user',
          subscription_days: userData.subscription_days || 0,
          allowed_ips: userData.allowed_ips || [],
          is_banned: false
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating user:', error);
        throw new Error(`Erro ao criar usuário: ${error.message}`);
      }

      if (!data) {
        throw new Error('Nenhum dado retornado após criação');
      }

      console.log('Usuário criado no Supabase:', data);
      return data as User;
    } catch (error) {
      console.error('Erro ao criar usuário no Supabase:', error);
      throw error;
    }
  }
  
  // Fallback para mock se Supabase não estiver configurado
  console.log('Supabase não configurado, usando mock');
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
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  console.log('Atualizando usuário mock:', userId);
  
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates, updated_at: new Date().toISOString() };
    return mockUsers[userIndex];
  }
  
  throw new Error('Usuário não encontrado');
};

export const deleteUser = async (userId: string): Promise<void> => {
  console.log('Deletando usuário mock:', userId);
  mockUsers = mockUsers.filter(u => u.id !== userId);
};

// Processing sessions
export const getUserSession = async (userId: string): Promise<ProcessingSession | null> => {
  console.log('Buscando sessão para usuário:', userId);
  
  const session = mockSessions.find(s => s.user_id === userId);
  return session || null;
};

export const createSession = async (userId: string): Promise<ProcessingSession> => {
  console.log('Criando sessão mock para usuário:', userId);
  
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
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession> => {
  console.log('Atualizando sessão mock:', sessionId);
  
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
};

// Subscription plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  console.log('Retornando planos mock');
  return mockPlans;
};

export const createSubscriptionPlan = async (plan: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): Promise<SubscriptionPlan> => {
  console.log('Criando plano mock:', plan.name);
  
  const newPlan: SubscriptionPlan = {
    id: crypto.randomUUID(),
    ...plan,
    description: plan.description || '',
    is_active: true,
    created_at: new Date().toISOString()
  };
  
  mockPlans.push(newPlan);
  return newPlan;
};

export const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
  console.log('Atualizando plano mock:', planId);
  
  const planIndex = mockPlans.findIndex(p => p.id === planId);
  if (planIndex !== -1) {
    mockPlans[planIndex] = { ...mockPlans[planIndex], ...updates };
    return mockPlans[planIndex];
  }
  
  throw new Error('Plano não encontrado');
};

// User purchases
export const getUserPurchases = async (userId: string): Promise<UserPurchase[]> => {
  console.log('Retornando compras mock para usuário:', userId);
  return mockPurchases.filter(p => p.user_id === userId);
};

export const createPurchase = async (purchase: {
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method?: string;
}): Promise<UserPurchase> => {
  console.log('Criando compra mock');
  
  const newPurchase: UserPurchase = {
    id: crypto.randomUUID(),
    ...purchase,
    payment_method: purchase.payment_method || 'manual',
    created_at: new Date().toISOString()
  };
  
  mockPurchases.push(newPurchase);
  return newPurchase;
};

// Analytics
export const getSystemStats = async () => {
  console.log('Retornando estatísticas mock');
  
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
};