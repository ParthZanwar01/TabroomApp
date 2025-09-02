/**
 * Color scheme for the Debate Tournaments app
 * Soft, professional colors optimized for both light and dark themes
 */

export const Colors = {
  light: {
    // Primary colors - soft blue theme
    primary: '#3B82F6',        // Soft blue
    primaryLight: '#60A5FA',   // Lighter blue
    primaryDark: '#2563EB',    // Darker blue
    
    // Background colors
    background: '#FFFFFF',      // Pure white
    backgroundSecondary: '#F8FAFC', // Very light gray
    backgroundTertiary: '#F1F5F9', // Light gray
    
    // Surface colors
    surface: '#FFFFFF',         // White surface
    surfaceSecondary: '#F8FAFC', // Light surface
    surfaceTertiary: '#F1F5F9',  // Lighter surface
    
    // Text colors
    text: '#1E293B',           // Dark slate
    textSecondary: '#475569',  // Medium slate
    textTertiary: '#64748B',   // Light slate
    textInverse: '#FFFFFF',    // White text
    
    // Border colors
    border: '#E2E8F0',         // Light gray border
    borderSecondary: '#CBD5E1', // Medium gray border
    
    // Status colors
    success: '#10B981',        // Soft green
    warning: '#F59E0B',        // Soft amber
    error: '#EF4444',          // Soft red
    info: '#3B82F6',           // Soft blue
    
    // Accent colors
    accent: '#8B5CF6',         // Soft purple
    accentLight: '#A78BFA',    // Lighter purple
    
    // Tab bar colors
    tabIconDefault: '#94A3B8', // Medium gray
    tabIconSelected: '#3B82F6', // Primary blue
    tint: '#3B82F6',           // Primary blue
  },
  
  dark: {
    // Primary colors - soft blue theme
    primary: '#60A5FA',        // Lighter blue for dark theme
    primaryLight: '#93C5FD',   // Even lighter blue
    primaryDark: '#3B82F6',    // Standard blue
    
    // Background colors
    background: '#0F172A',     // Very dark blue-gray
    backgroundSecondary: '#1E293B', // Dark blue-gray
    backgroundTertiary: '#334155',  // Medium blue-gray
    
    // Surface colors
    surface: '#1E293B',        // Dark surface
    surfaceSecondary: '#334155', // Medium surface
    surfaceTertiary: '#475569',   // Lighter surface
    
    // Text colors
    text: '#F8FAFC',           // Very light gray
    textSecondary: '#E2E8F0',  // Light gray
    textTertiary: '#CBD5E1',   // Medium gray
    textInverse: '#0F172A',    // Dark text
    
    // Border colors
    border: '#334155',          // Medium blue-gray border
    borderSecondary: '#475569', // Lighter blue-gray border
    
    // Status colors
    success: '#34D399',        // Lighter green for dark theme
    warning: '#FBBF24',        // Lighter amber for dark theme
    error: '#F87171',          // Lighter red for dark theme
    info: '#60A5FA',           // Lighter blue for dark theme
    
    // Accent colors
    accent: '#A78BFA',         // Lighter purple for dark theme
    accentLight: '#C4B5FD',    // Even lighter purple
    
    // Tab bar colors
    tabIconDefault: '#64748B', // Medium gray
    tabIconSelected: '#60A5FA', // Primary blue
    tint: '#60A5FA',           // Primary blue
  },
};

// Helper function to get theme-aware colors
export const getThemeColors = (isDark: boolean) => {
  return isDark ? Colors.dark : Colors.light;
};
