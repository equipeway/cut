import { sql, isNeonConfigured } from './neon';

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
  plan_name?: string;
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

// User functions
export async function getUserByEmail(email: string): Promise<User | null> {
  if (!isNeonConfigured()) {
    console.warn('Neon not configured, returning null');
    return null;
  }

  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;
    return result[0] as User || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  if (!isNeonConfigured()) {
    return [];
  }

  try {
    const result = await sql`
      SELECT * FROM users ORDER BY created_at DESC
    `;
    return result as User[];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

export async function banUser(userId: string): Promise<boolean> {
  if (!isNeonConfigured()) {
    return false;
  }

  try {
    await sql`
      UPDATE users 
      SET is_banned = true, updated_at = now() 
      WHERE id = ${userId}
    `;
    return true;
  } catch (error) {
    console.error('Error banning user:', error);
    return false;
  }
}

export async function unbanUser(userId: string): Promise<boolean> {
  if (!isNeonConfigured()) {
    return false;
  }

  try {
    await sql`
      UPDATE users 
      SET is_banned = false, updated_at = now() 
      WHERE id = ${userId}
    `;
    return true;
  } catch (error) {
    console.error('Error unbanning user:', error);
    return false;
  }
}

export async function updateUserSubscription(email: string, additionalDays: number): Promise<boolean> {
  if (!isNeonConfigured()) {
    return false;
  }

  try {
    await sql`
      UPDATE users 
      SET subscription_days = subscription_days + ${additionalDays}, updated_at = now() 
      WHERE email = ${email}
    `;
    return true;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return false;
  }
}

// Subscription plan functions
export async function getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (!isNeonConfigured()) {
    return [];
  }

  try {
    const result = await sql`
      SELECT * FROM subscription_plans ORDER BY created_at DESC
    `;
    return result as SubscriptionPlan[];
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return [];
  }
}

export async function createSubscriptionPlan(
  name: string, 
  days: number, 
  price: number, 
  description: string = ''
): Promise<SubscriptionPlan | null> {
  if (!isNeonConfigured()) {
    return null;
  }

  try {
    const result = await sql`
      INSERT INTO subscription_plans (name, days, price, description)
      VALUES (${name}, ${days}, ${price}, ${description})
      RETURNING *
    `;
    return result[0] as SubscriptionPlan;
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return null;
  }
}

export async function updateSubscriptionPlan(
  planId: string, 
  updates: Partial<SubscriptionPlan>
): Promise<boolean> {
  if (!isNeonConfigured()) {
    return false;
  }

  try {
    const setClause = Object.entries(updates)
      .map(([key, value]) => `${key} = ${typeof value === 'string' ? `'${value}'` : value}`)
      .join(', ');

    if (updates.is_active !== undefined) {
      await sql`
        UPDATE subscription_plans 
        SET is_active = ${updates.is_active}
        WHERE id = ${planId}
      `;
    }

    if (updates.name) {
      await sql`
        UPDATE subscription_plans 
        SET name = ${updates.name}
        WHERE id = ${planId}
      `;
    }

    if (updates.days !== undefined) {
      await sql`
        UPDATE subscription_plans 
        SET days = ${updates.days}
        WHERE id = ${planId}
      `;
    }

    if (updates.price !== undefined) {
      await sql`
        UPDATE subscription_plans 
        SET price = ${updates.price}
        WHERE id = ${planId}
      `;
    }

    if (updates.description) {
      await sql`
        UPDATE subscription_plans 
        SET description = ${updates.description}
        WHERE id = ${planId}
      `;
    }

    return true;
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return false;
  }
}

export async function deleteSubscriptionPlan(planId: string): Promise<boolean> {
  if (!isNeonConfigured()) {
    return false;
  }

  try {
    await sql`
      DELETE FROM subscription_plans WHERE id = ${planId}
    `;
    return true;
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    return false;
  }
}

// User purchase functions
export async function getAllUserPurchases(): Promise<UserPurchase[]> {
  if (!isNeonConfigured()) {
    return [];
  }

  try {
    const result = await sql`
      SELECT 
        up.*,
        sp.name as plan_name
      FROM user_purchases up
      LEFT JOIN subscription_plans sp ON up.plan_id = sp.id
      ORDER BY up.created_at DESC
    `;
    return result as UserPurchase[];
  } catch (error) {
    console.error('Error getting user purchases:', error);
    return [];
  }
}

export async function createUserPurchase(
  userEmail: string,
  planId: string,
  daysAdded: number,
  amountPaid: number,
  paymentMethod: string = 'manual'
): Promise<UserPurchase | null> {
  if (!isNeonConfigured()) {
    return null;
  }

  try {
    // Get user ID from email
    const user = await getUserByEmail(userEmail);
    if (!user) {
      throw new Error('User not found');
    }

    const result = await sql`
      INSERT INTO user_purchases (user_id, plan_id, days_added, amount_paid, payment_method)
      VALUES (${user.id}, ${planId}, ${daysAdded}, ${amountPaid}, ${paymentMethod})
      RETURNING *
    `;
    return result[0] as UserPurchase;
  } catch (error) {
    console.error('Error creating user purchase:', error);
    return null;
  }
}

// Login attempt functions
export async function logLoginAttempt(
  ipAddress: string, 
  userEmail: string, 
  success: boolean
): Promise<void> {
  if (!isNeonConfigured()) {
    console.warn('Neon not configured, skipping login attempt log');
    return;
  }

  try {
    await sql`
      INSERT INTO login_attempts (ip_address, user_email, success)
      VALUES (${ipAddress}, ${userEmail}, ${success})
    `;
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
}

// Alias functions for compatibility
export const getUsers = getAllUsers;