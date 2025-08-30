import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserByEmail, logLoginAttempt } from '../lib/database';
import { isSupabaseConfigured } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  subscription_days: number;
  is_banned: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, ipAddress?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem('terramail_user');
        if (savedUser && isSupabaseConfigured()) {
          const userData = JSON.parse(savedUser);
          
          // Validate user still exists in Supabase
          const dbUser = await getUserByEmail(userData.email);
          if (dbUser && dbUser.id === userData.id) {
            setUser({
              id: dbUser.id,
              email: dbUser.email,
              role: dbUser.role,
              subscription_days: dbUser.subscription_days,
              is_banned: dbUser.is_banned
            });
          } else {
            localStorage.removeItem('terramail_user');
          }
        }
      } catch (error) {
        console.error('Error validating saved user:', error);
        localStorage.removeItem('terramail_user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, ipAddress: string = '127.0.0.1') => {
    if (!isSupabaseConfigured()) {
      return { 
        success: false, 
        error: 'Sistema não configurado. Por favor, conecte ao Supabase para usar esta funcionalidade.' 
      };
    }

    console.log('Login attempt for email:', email);

    try {
      const foundUser = await getUserByEmail(email);
      
      console.log('User found in database:', foundUser ? 'Yes' : 'No');
      
      if (!foundUser) {
        await logLoginAttempt(ipAddress, email, false);
        console.log('Login failed: Email not found');
        return { success: false, error: 'Email não encontrado' };
      }

      console.log('Password hash from database:', foundUser.password_hash);
      console.log('Password provided:', password);
      console.log('Hash starts with $2a$ or $2b$:', foundUser.password_hash.startsWith('$2a$') || foundUser.password_hash.startsWith('$2b$'));
      
      console.log('Comparing password...');
      let passwordMatch = false;
      
      try {
        // Since passwords are now stored as plain text, use direct comparison
        passwordMatch = password === foundUser.password_hash;
        console.log('Direct comparison result:', passwordMatch);
      } catch (error) {
        console.error('Password comparison error:', error);
        passwordMatch = false;
      }
      
      console.log('Password match:', passwordMatch);
      
      if (!passwordMatch) {
        await logLoginAttempt(ipAddress, email, false);
        return { success: false, error: 'Senha incorreta' };
      }

      if (foundUser.is_banned) {
        await logLoginAttempt(ipAddress, email, false);
        return { success: false, error: 'Conta banida' };
      }

      // Login successful
      console.log('Login successful for user:', foundUser.email);
      const userData: User = {
        id: foundUser.id,
        email: foundUser.email,
        role: foundUser.role,
        subscription_days: foundUser.subscription_days,
        is_banned: foundUser.is_banned
      };

      localStorage.setItem('terramail_user', JSON.stringify(userData));
      setUser(userData);
      await logLoginAttempt(ipAddress, email, true);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Erro interno do sistema. Tente novamente.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('terramail_user');
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