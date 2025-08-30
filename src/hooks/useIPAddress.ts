import { useState, useEffect } from 'react';

export function useIPAddress() {
  const [ipAddress, setIPAddress] = useState<string>('127.0.0.1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIP = async () => {
      try {
        // Try multiple IP services
        const services = [
          'https://api.ipify.org?format=json',
          'https://ipapi.co/json/',
          'https://api.ip.sb/jsonip'
        ];

        for (const service of services) {
          try {
            const response = await fetch(service);
            const data = await response.json();
            const ip = data.ip || data.query;
            if (ip) {
              setIPAddress(ip);
              break;
            }
          } catch (error) {
            console.warn(`Failed to fetch IP from ${service}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch IP address:', error);
        // Fallback to localhost for development
        setIPAddress('127.0.0.1');
      } finally {
        setLoading(false);
      }
    };

    fetchIP();
  }, []);

  return { ipAddress, loading };
}