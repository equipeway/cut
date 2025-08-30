// Direct database operations using better-sqlite3
import {
  getUserByEmailDB,
  getUserByIdDB,
  getUsersDB,
  createUserDB,
  updateUserDB,
  deleteUserDB,
  getUserSessionDB,
  createSessionDB,
  updateSessionDB,
  getSubscriptionPlansDB,
  getAllSubscriptionPlansDB,
  createSubscriptionPlanDB,
  updateSubscriptionPlanDB,
  deleteSubscriptionPlanDB,
  createPurchaseDB,
  getSystemStatsDB,
  User,
  ProcessingSession,
  SubscriptionPlan,
  UserPurchase
} from './database';

// Export types
export type { User, ProcessingSession, SubscriptionPlan, UserPurchase };

// Auth operations
export const loginUser = async (email: string, password: string): Promise<{ user: User }> => {
  const user = getUserByEmailDB(email);
  
  if (!user) {
    throw new Error('Email não encontrado');
  }

  if (user.password_hash !== password) {
    throw new Error('Senha incorreta');
  }

  if (user.is_banned) {
    throw new Error('Conta banida');
  }

  // Return user without password
  const { password_hash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword as User };
};

// User operations
export const getUsers = (): User[] => {
  return getUsersDB();
};

export const createUser = (userData: {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  subscription_days?: number;
}): User => {
  return createUserDB(userData);
};

export const updateUser = (userId: string, updates: Partial<User>): User | null => {
  return updateUserDB(userId, updates);
};

export const deleteUser = (userId: string): void => {
  return deleteUserDB(userId);
};

// Session operations
export const getUserSessionAPI = async (userId: string): Promise<ProcessingSession> => {
  let session = getUserSessionDB(userId);
  if (!session) {
    session = createSessionDB(userId);
  }
  return session;
};

export const updateSession = (sessionId: string, updates: Partial<ProcessingSession>): ProcessingSession | null => {
  return updateSessionDB(sessionId, updates);
};

// Plan operations
export const getSubscriptionPlans = (): SubscriptionPlan[] => {
  return getSubscriptionPlansDB();
};

export const getAllSubscriptionPlans = (): SubscriptionPlan[] => {
  return getAllSubscriptionPlansDB();
};

export const createSubscriptionPlan = (planData: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): SubscriptionPlan => {
  return createSubscriptionPlanDB(planData);
};

export const updateSubscriptionPlan = (planId: string, updates: Partial<SubscriptionPlan>): SubscriptionPlan | null => {
  return updateSubscriptionPlanDB(planId, updates);
};

export const deleteSubscriptionPlan = (planId: string): void => {
  return deleteSubscriptionPlanDB(planId);
};

// Purchase operations
export const createPurchase = (purchaseData: {
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method?: string;
}): UserPurchase => {
  return createPurchaseDB(purchaseData);
};

// Stats
export const getSystemStats = () => {
  return getSystemStatsDB();
};

// Health check
export const checkHealth = async (): Promise<boolean> => {
  try {
    getUsers();
    return true;
  } catch (error) {
    return false;
  }
};