import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserByEmail, User as DBUser } from '../lib/database';
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuários hardcoded com UUIDs válidos
const DEMO_USERS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@terramail.com',
    password: 'admin123',
    role: 'admin' as const,
    subscription_days: 365,
    is_banned: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'user@terramail.com',
    password: 'user123',
    role: 'user' as const,
    subscription_days: 30,
    is_banned: false
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSavedUser = async () => {
      const savedUser = localStorage.getItem('terramail_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          
          // Se Supabase está configurado, validar se o usuário existe no banco
          if (isSupabaseConfigured()) {
            const dbUser = await getUserByEmail(userData.email);
            if (!dbUser || dbUser.id !== userData.id) {
              // Usuário não existe no Supabase ou ID não confere, fazer logout
              console.log('Usuário do localStorage não existe no Supabase, fazendo logout');
              localStorage.removeItem('terramail_user');
              setUser(null);
              setLoading(false);
              return;
            }
          }
          
          setUser(userData);
        } catch (error) {
          console.error('Error parsing saved user data:', error);
          localStorage.removeItem('terramail_user');
        }
      }
      setLoading(false);
    };
    
    loadSavedUser();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Tentando login com:', { email, password });
    
    if (isSupabaseConfigured()) {
      // Usar Supabase para autenticação
      const foundUser = await getUserByEmail(email);
      
      if (!foundUser) {
        console.log('Usuário não encontrado no Supabase');
        return { success: false, error: 'Email não encontrado' };
      }

      // Comparar senha com hash
      const passwordMatch = await bcrypt.compare(password, foundUser.password_hash);
      
      if (!passwordMatch) {
        console.log('Senha incorreta');
        return { success: false, error: 'Senha incorreta' };
      }

      if (foundUser.is_banned) {
        console.log('Usuário banido');
        return { success: false, error: 'Conta banida' };
      }

      // Login bem-sucedido com dados do Supabase
      const userData: User = {
        id: foundUser.id,
        email: foundUser.email,
        role: foundUser.role,
        subscription_days: foundUser.subscription_days,
        is_banned: foundUser.is_banned
      };

      localStorage.setItem('terramail_user', JSON.stringify(userData));
      setUser(userData);
      console.log('Login realizado com sucesso (Supabase)');

      return { success: true };
    } else {
      // Fallback para dados hardcoded quando Supabase não está configurado
      const foundUser = DEMO_USERS.find(u => u.email === email);
      
      if (!foundUser) {
        console.log('Usuário não encontrado');
        return { success: false, error: 'Email não encontrado' };
      }

      if (foundUser.password !== password) {
        console.log('Senha incorreta');
        return { success: false, error: 'Senha incorreta' };
      }

      if (foundUser.is_banned) {
        console.log('Usuário banido');
        return { success: false, error: 'Conta banida' };
      }

      // Login bem-sucedido com dados mock
      const userData: User = {
        id: foundUser.id,
        email: foundUser.email,
        role: foundUser.role,
        subscription_days: foundUser.subscription_days,
        is_banned: foundUser.is_banned
      };

      localStorage.setItem('terramail_user', JSON.stringify(userData));
      setUser(userData);
      console.log('Login realizado com sucesso (Mock)');

      return { success: true };
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