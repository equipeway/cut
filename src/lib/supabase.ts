import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          role: 'user' | 'admin';
          subscription_days: number;
          allowed_ips: string[];
          is_banned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          role?: 'user' | 'admin';
          subscription_days?: number;
          allowed_ips?: string[];
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          role?: 'user' | 'admin';
          subscription_days?: number;
          allowed_ips?: string[];
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      login_attempts: {
        Row: {
          id: string;
          ip_address: string;
          user_email: string | null;
          success: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_address: string;
          user_email?: string | null;
          success?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          ip_address?: string;
          user_email?: string | null;
          success?: boolean;
          created_at?: string;
        };
      };
      banned_ips: {
        Row: {
          id: string;
          ip_address: string;
          reason: string;
          banned_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_address: string;
          reason?: string;
          banned_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ip_address?: string;
          reason?: string;
          banned_until?: string | null;
          created_at?: string;
        };
      };
      processing_sessions: {
        Row: {
          id: string;
          user_id: string;
          approved_count: number;
          rejected_count: number;
          loaded_count: number;
          tested_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          approved_count?: number;
          rejected_count?: number;
          loaded_count?: number;
          tested_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          approved_count?: number;
          rejected_count?: number;
          loaded_count?: number;
          tested_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};