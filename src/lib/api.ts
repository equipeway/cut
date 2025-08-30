// API operations using SQLite database
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
  const user = await getUserByEmailDB(email);
  
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
export const getUsers = async (): Promise<User[]> => {
  return await getUsersDB();
};

export const createUser = async (userData: {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  subscription_days?: number;
}): Promise<User> => {
  return await createUserDB(userData);
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  return await updateUserDB(userId, updates);
};

export const deleteUser = async (userId: string): Promise<void> => {
  return await deleteUserDB(userId);
};

// Session operations
export const getUserSessionAPI = async (userId: string): Promise<ProcessingSession> => {
  let session = await getUserSessionDB(userId);
  if (!session) {
    session = await createSessionDB(userId);
  }
  return session;
};

export const updateSession = async (sessionId: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession | null> => {
  return await updateSessionDB(sessionId, updates);
};

// Plan operations
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  return await getSubscriptionPlansDB();
};

export const getAllSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  return await getAllSubscriptionPlansDB();
};

export const createSubscriptionPlan = async (planData: {
  name: string;
  days: number;
  price: number;
  description?: string;
}): Promise<SubscriptionPlan> => {
  return await createSubscriptionPlanDB(planData);
};

export const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> => {
  return await updateSubscriptionPlanDB(planId, updates);
};

export const deleteSubscriptionPlan = async (planId: string): Promise<void> => {
  return await deleteSubscriptionPlanDB(planId);
};

// Purchase operations
export const createPurchase = async (purchaseData: {
  user_id: string;
  plan_id: string;
  days_added: number;
  amount_paid: number;
  payment_method?: string;
}): Promise<UserPurchase> => {
  return await createPurchaseDB(purchaseData);
};

// Stats
export const getSystemStats = async () => {
  return await getSystemStatsDB();
};

// Health check
export const checkHealth = async (): Promise<boolean> => {
  try {
    await getUsers();
    return true;
  } catch (error) {
    return false;
  }
};