/**
 * Black and white minimalist theme for the Debate Tournaments app
 * Clean, monochrome design with subtle grays
 */

export const Colors = {
  light: {
    // Primary colors - black and white theme
    primary: '#000000',        // Pure black
    primaryLight: '#404040',   // Dark gray
    primaryDark: '#000000',    // Pure black
    
    // Background colors
    background: '#FFFFFF',      // Pure white
    backgroundSecondary: '#F8F8F8', // Very light gray
    backgroundTertiary: '#F0F0F0', // Light gray
    
    // Surface colors
    surface: '#FFFFFF',         // Pure white
    surfaceSecondary: '#FAFAFA', // Very light surface
    surfaceTertiary: '#F5F5F5',  // Light surface
    card: '#FFFFFF',            // Card background
    
    // Text colors
    text: '#000000',           // Pure black
    textSecondary: '#666666',  // Medium gray
    textTertiary: '#999999',   // Light gray
    textInverse: '#FFFFFF',    // White text
    
    // Border colors
    border: '#E0E0E0',         // Light border
    borderSecondary: '#CCCCCC', // Medium border
    
    // Status colors
    success: '#000000',        // Black
    warning: '#666666',        // Gray
    error: '#000000',          // Black
    info: '#000000',           // Black
    
    // Accent colors
    accent: '#000000',         // Black
    accentLight: '#404040',    // Dark gray
    
    // Tab bar colors
    tabIconDefault: '#999999', // Light gray
    tabIconSelected: '#000000', // Black
    tint: '#000000',           // Black
  },
  
  dark: {
    // Primary colors - black and white theme
    primary: '#FFFFFF',        // Pure white
    primaryLight: '#CCCCCC',   // Light gray
    primaryDark: '#FFFFFF',    // Pure white
    
    // Background colors
    background: '#000000',     // Pure black
    backgroundSecondary: '#111111', // Very dark gray
    backgroundTertiary: '#1A1A1A',  // Dark gray
    
    // Surface colors
    surface: '#000000',        // Pure black
    surfaceSecondary: '#111111', // Very dark surface
    surfaceTertiary: '#1A1A1A',   // Dark surface
    card: '#000000',           // Card background
    
    // Text colors
    text: '#FFFFFF',           // Pure white
    textSecondary: '#CCCCCC',  // Light gray
    textTertiary: '#999999',   // Medium gray
    textInverse: '#000000',    // Black text
    
    // Border colors
    border: '#333333',          // Dark border
    borderSecondary: '#555555', // Lighter border
    
    // Status colors
    success: '#FFFFFF',        // White
    warning: '#CCCCCC',        // Light gray
    error: '#FFFFFF',          // White
    info: '#FFFFFF',           // White
    
    // Accent colors
    accent: '#FFFFFF',         // White
    accentLight: '#CCCCCC',    // Light gray
    
    // Tab bar colors
    tabIconDefault: '#666666', // Medium gray
    tabIconSelected: '#FFFFFF', // White
    tint: '#FFFFFF',           // White
  },
};

// Helper function to get theme-aware colors
export const getThemeColors = (isDark: boolean) => {
  return isDark ? Colors.dark : Colors.light;
};
