// Local storage utilities for user data
export interface User {
  id: string;
  email: string;
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

// Initialize default data
const initializeData = () => {
  if (!localStorage.getItem('terramail_users')) {
    const defaultUsers: User[] = [
      {
        id: '1',
        email: 'admin@terramail.com',
        role: 'admin',
        subscription_days: 999,
        allowed_ips: [],
        is_banned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('terramail_users', JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem('terramail_login_attempts')) {
    localStorage.setItem('terramail_login_attempts', JSON.stringify([]));
  }

  if (!localStorage.getItem('terramail_banned_ips')) {
    localStorage.setItem('terramail_banned_ips', JSON.stringify([]));
  }

  if (!localStorage.getItem('terramail_sessions')) {
    localStorage.setItem('terramail_sessions', JSON.stringify([]));
  }
};

// User operations
export const getUsers = (): User[] => {
  initializeData();
  return JSON.parse(localStorage.getItem('terramail_users') || '[]');
};

export const getUserByEmail = (email: string): User | null => {
  const users = getUsers();
  return users.find(user => user.email === email) || null;
};

export const updateUser = (userId: string, updates: Partial<User>): User | null => {
  const users = getUsers();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) return null;
  
  users[userIndex] = { ...users[userIndex], ...updates, updated_at: new Date().toISOString() };
  localStorage.setItem('terramail_users', JSON.stringify(users));
  return users[userIndex];
};

// Login attempts
export const getLoginAttempts = (): LoginAttempt[] => {
  return JSON.parse(localStorage.getItem('terramail_login_attempts') || '[]');
};

export const addLoginAttempt = (attempt: Omit<LoginAttempt, 'id' | 'created_at'>): void => {
  const attempts = getLoginAttempts();
  const newAttempt: LoginAttempt = {
    ...attempt,
    id: Date.now().toString(),
    created_at: new Date().toISOString()
  };
  attempts.push(newAttempt);
  localStorage.setItem('terramail_login_attempts', JSON.stringify(attempts));
};

export const getRecentFailedAttempts = (ipAddress: string, hoursAgo: number = 1): LoginAttempt[] => {
  const attempts = getLoginAttempts();
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  return attempts.filter(attempt => 
    attempt.ip_address === ipAddress && 
    !attempt.success && 
    new Date(attempt.created_at) > cutoff
  );
};

// Banned IPs
export const getBannedIPs = (): BannedIP[] => {
  return JSON.parse(localStorage.getItem('terramail_banned_ips') || '[]');
};

export const isIPBanned = (ipAddress: string): boolean => {
  const bannedIPs = getBannedIPs();
  const ban = bannedIPs.find(ban => ban.ip_address === ipAddress);
  
  if (!ban) return false;
  if (!ban.banned_until) return true;
  
  return new Date(ban.banned_until) > new Date();
};

export const banIP = (ipAddress: string, reason: string = 'Too many failed login attempts', hours: number = 24): void => {
  const bannedIPs = getBannedIPs();
  const newBan: BannedIP = {
    id: Date.now().toString(),
    ip_address: ipAddress,
    reason,
    banned_until: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  };
  bannedIPs.push(newBan);
  localStorage.setItem('terramail_banned_ips', JSON.stringify(bannedIPs));
};

export const unbanIP = (id: string): void => {
  const bannedIPs = getBannedIPs();
  const filtered = bannedIPs.filter(ban => ban.id !== id);
  localStorage.setItem('terramail_banned_ips', JSON.stringify(filtered));
};

// Processing sessions
export const getProcessingSessions = (): ProcessingSession[] => {
  return JSON.parse(localStorage.getItem('terramail_sessions') || '[]');
};

export const getUserSession = (userId: string): ProcessingSession | null => {
  const sessions = getProcessingSessions();
  return sessions.find(session => session.user_id === userId) || null;
};

export const createSession = (userId: string): ProcessingSession => {
  const sessions = getProcessingSessions();
  const newSession: ProcessingSession = {
    id: Date.now().toString(),
    user_id: userId,
    approved_count: 0,
    rejected_count: 0,
    loaded_count: 0,
    tested_count: 0,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  sessions.push(newSession);
  localStorage.setItem('terramail_sessions', JSON.stringify(sessions));
  return newSession;
};

export const updateSession = (sessionId: string, updates: Partial<ProcessingSession>): ProcessingSession | null => {
  const sessions = getProcessingSessions();
  const sessionIndex = sessions.findIndex(session => session.id === sessionId);
  
  if (sessionIndex === -1) return null;
  
  sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates, updated_at: new Date().toISOString() };
  localStorage.setItem('terramail_sessions', JSON.stringify(sessions));
  return sessions[sessionIndex];
};