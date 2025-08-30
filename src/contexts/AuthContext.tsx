import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserByEmail, logLoginAttempt, User } from '../lib/database';
import { isNeonConfigured } from '../lib/neon';

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
        if (savedUser && isNeonConfigured()) {
          const userData = JSON.parse(savedUser);
          
          // Validate user still exists in Neon
          const dbUser = await getUserByEmail(userData.email);
          if (dbUser && dbUser.id === userData.id) {
            setUser({
              id: dbUser.id,
              email: dbUser.email,
              password_hash: dbUser.password_hash,
              role: dbUser.role,
              subscription_days: dbUser.subscription_days,
              allowed_ips: dbUser.allowed_ips,
              is_banned: dbUser.is_banned,
              created_at: dbUser.created_at,
              updated_at: dbUser.updated_at
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
    if (!isNeonConfigured()) {
      return { 
        success: false, 
        error: 'Sistema não configurado. Por favor, configure o Neon Database para usar esta funcionalidade.' 
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
        password_hash: foundUser.password_hash,
        role: foundUser.role,
        subscription_days: foundUser.subscription_days,
        allowed_ips: foundUser.allowed_ips,
        is_banned: foundUser.is_banned,
        created_at: foundUser.created_at,
        updated_at: foundUser.updated_at
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