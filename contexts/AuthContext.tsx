import { clearBackendSessionId, getBackendSessionId } from '@/lib/api/tabroom';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []); // Run only once on mount

  async function checkAuthStatus() {
    console.log('AuthContext - starting checkAuthStatus');
    
    try {
      console.log('AuthContext - calling getBackendSessionId...');
      // Add a timeout to prevent hanging
      const sessionId = await Promise.race([
        getBackendSessionId(),
        new Promise<undefined>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      console.log('AuthContext - sessionId:', sessionId);
      const authenticated = !!sessionId;
      setIsAuthenticated(authenticated);
      console.log('AuthContext - isAuthenticated set to:', authenticated);
    } catch (e) {
      console.log('AuthContext - error checking auth:', e);
      setIsAuthenticated(false);
    } finally {
      console.log('AuthContext - setting isLoading to false');
      setIsLoading(false);
    }
  }

  function login() {
    setIsAuthenticated(true);
  }

  async function logout() {
    try {
      await clearBackendSessionId();
    } catch (e) {
      // Ignore errors
    }
    setIsAuthenticated(false);
    setIsLoading(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
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
