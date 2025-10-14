import { clearBackendSessionId, getBackendSessionId } from '@/lib/api/tabroom';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

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
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Prevent infinite loops
    if (hasChecked) {
      return;
    }
    
    // Check if we're already on the login page (web only)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      console.log('AuthContext - current path:', currentPath);
      
      if (currentPath === '/login') {
        console.log('AuthContext - already on login page, skipping auth check');
        setIsLoading(false);
        setIsAuthenticated(false);
        setHasChecked(true);
        return;
      }
    }
    
    checkAuthStatus();
  }, []); // Remove hasChecked from dependency array

  async function checkAuthStatus() {
    console.log('AuthContext - starting checkAuthStatus');
    
    try {
      const sessionId = await getBackendSessionId();
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
      setHasChecked(true);
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
    // Don't reset hasChecked to prevent infinite loop
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
