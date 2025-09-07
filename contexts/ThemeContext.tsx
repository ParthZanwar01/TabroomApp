import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { Colors, getThemeColors } from '@/constants/Colors';

// Define the theme context type
type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  colors: typeof Colors.light;
};

// Create the theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use theme
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get the current color scheme (light/dark)
export function useColorScheme(): 'light' | 'dark' {
  const { isDark } = useTheme();
  return isDark ? 'dark' : 'light';
}

// Theme provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  // Update theme when system theme changes
  useEffect(() => {
    setIsDark(systemColorScheme === 'dark');
  }, [systemColorScheme]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const setTheme = (dark: boolean) => {
    setIsDark(dark);
  };

  const colors = getThemeColors(isDark);

  const value: ThemeContextType = {
    isDark,
    toggleTheme,
    setTheme,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
