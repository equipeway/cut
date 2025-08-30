// Direct database operations - no API calls needed
import {
  getDatabase,
  getUserByEmail,
  getUserById,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserSession,
  createSession,
  updateSession,
  getSubscriptionPlans,
  getAllSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  createPurchase,
  getSystemStats,
  initDatabase,
  User,
  ProcessingSession,
  SubscriptionPlan,
  UserPurchase
} from './database';

// Export types
export type { User, ProcessingSession, SubscriptionPlan, UserPurchase };

// Auth operations
export const loginUser = async (email: string, password: string): Promise<{ user: User }> => {
  const user = getUserByEmail(email);
  
  if (!user) {
    throw new Error('Email não encontrado');
  }

  if (user.password !== password) {
    throw new Error('Senha incorreta');
  }

  if (user.is_banned) {
    throw new Error('Conta banida');
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword as User };
};

// User operations
export { getUsers, createUser, updateUser, deleteUser };

// Session operations
export const getUserSessionAPI = async (userId: string): Promise<ProcessingSession> => {
  let session = getUserSession(userId);
  if (!session) {
    session = createSession(userId);
  }
  return session;
};

export { updateSession };

// Plan operations
export { 
  getSubscriptionPlans, 
  getAllSubscriptionPlans, 
  createSubscriptionPlan, 
  updateSubscriptionPlan, 
  deleteSubscriptionPlan 
};

// Stats
export { getSystemStats };

// Health check
export const checkHealth = async (): Promise<boolean> => {
  try {
    getDatabase();
    return true;
  } catch (error) {
    return false;
  }
};

// Initialize on import
initDatabase();