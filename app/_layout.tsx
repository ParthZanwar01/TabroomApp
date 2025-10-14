import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('RootLayoutNav - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);

  // Check if we're already on the login page (web only)
  const isOnLoginPage = Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname === '/login';
  console.log('RootLayoutNav - isOnLoginPage:', isOnLoginPage);

  if (isLoading) {
    console.log('RootLayoutNav - showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated && !isOnLoginPage) {
    console.log('RootLayoutNav - redirecting to login');
    return <Redirect href="/login" />;
  }

  console.log('RootLayoutNav - showing main app');
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 18,
    color: '#000000',
  },
});
