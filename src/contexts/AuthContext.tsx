import React, { createContext, useContext, useEffect, useState } from 'react';

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

// Usuários hardcoded para funcionar imediatamente
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
    const savedUser = localStorage.getItem('terramail_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('terramail_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Tentando login com:', { email, password });
    
    // Buscar usuário nos dados hardcoded
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

    // Login bem-sucedido
    const userData: User = {
      id: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
      subscription_days: foundUser.subscription_days,
      is_banned: foundUser.is_banned
    };

    localStorage.setItem('terramail_user', JSON.stringify(userData));
    setUser(userData);
    console.log('Login realizado com sucesso');

    return { success: true };
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