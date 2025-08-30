import React, { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { 
  User, 
  getUserByEmail, 
  addLoginAttempt, 
  getRecentFailedAttempts, 
  isIPBanned, 
  banIP,
  verifyPassword
} from '../lib/database';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, ipAddress: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('terramail_current_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      if (!userData.is_banned) {
        setUser(userData);
      } else {
        localStorage.removeItem('terramail_current_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, ipAddress: string) => {
    try {
      // Check if IP is banned
      if (await isIPBanned(ipAddress)) {
        return { success: false, error: 'IP address is banned' };
      }

      // Check recent failed attempts for this IP
      const recentAttempts = await getRecentFailedAttempts(ipAddress, 1);
      if (recentAttempts.length >= 5) {
        // Auto-ban IP
        await banIP(ipAddress, 'Too many failed login attempts', 24);
        return { success: false, error: 'Too many failed attempts. IP banned for 24 hours.' };
      }

      // Get user data
      const userData = await getUserByEmail(email);
      if (!userData) {
        try {
          await addLoginAttempt({
            ip_address: ipAddress,
            user_email: email,
            success: false
          });
        } catch (logError) {
          console.warn('Failed to log login attempt:', logError);
        }
        return { success: false, error: 'Invalid credentials' };
      }

      if (userData.is_banned) {
        return { success: false, error: 'Account is banned' };
      }

      // Check IP restrictions
      if (userData.allowed_ips.length > 0 && !userData.allowed_ips.includes(ipAddress)) {
        try {
          await addLoginAttempt({
            ip_address: ipAddress,
            user_email: email,
            success: false
          });
        } catch (logError) {
          console.warn('Failed to log login attempt:', logError);
        }
        return { success: false, error: 'IP address not allowed' };
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, userData.password_hash);
      if (!isValidPassword) {
        try {
          await addLoginAttempt({
            ip_address: ipAddress,
            user_email: email,
            success: false
          });
        } catch (logError) {
          console.warn('Failed to log login attempt:', logError);
        }
        return { success: false, error: 'Invalid credentials' };
      }

      // Log successful attempt
      try {
        await addLoginAttempt({
          ip_address: ipAddress,
          user_email: email,
          success: true
        });
      } catch (logError) {
        console.warn('Failed to log login attempt:', logError);
      }

      // Save user session
      localStorage.setItem('terramail_current_user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('terramail_current_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}