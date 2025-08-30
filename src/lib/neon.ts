import { neon } from '@neondatabase/serverless';

const databaseUrl = import.meta.env.VITE_DATABASE_URL;

// Use placeholder if not configured
const defaultUrl = 'postgresql://placeholder:placeholder@placeholder.neon.tech/placeholder?sslmode=require';

export const sql = neon(databaseUrl || defaultUrl);

// Check if Neon is properly configured
export const isNeonConfigured = () => {
  const isConfigured = databaseUrl && 
                      databaseUrl !== defaultUrl && 
                      databaseUrl.includes('neon.tech') &&
                      databaseUrl.startsWith('postgresql://');
  
  if (!isConfigured) {
    console.warn('Neon configuration check failed:', {
      hasUrl: !!databaseUrl,
      urlValid: databaseUrl?.includes('neon.tech'),
      protocolValid: databaseUrl?.startsWith('postgresql://')
    });
  }
  
  return isConfigured;
};

// Test connection
export const testConnection = async () => {
  if (!isNeonConfigured()) {
    throw new Error('Neon not configured');
  }

  try {
    const result = await sql`SELECT 1 as test`;
    return result.length > 0;
  } catch (error) {
    console.error('Neon connection test failed:', error);
    throw error;
  }
};