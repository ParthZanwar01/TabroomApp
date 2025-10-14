import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  console.log('RootLayoutNav - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
  console.log('RootLayoutNav - segments:', segments);

  // Check if we're on the login page
  const isOnLoginPage = useMemo(() => {
    return segments.some(segment => segment === 'login');
  }, [segments]);
  
  console.log('RootLayoutNav - isOnLoginPage:', isOnLoginPage);

  useEffect(() => {
    if (isLoading) return; // Don't redirect while loading

    if (!isAuthenticated && !isOnLoginPage) {
      console.log('RootLayoutNav - navigating to login');
      router.replace('/login');
    } else if (isAuthenticated && isOnLoginPage) {
      console.log('RootLayoutNav - navigating to main app');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, isOnLoginPage, router]);

  if (isLoading) {
    console.log('RootLayoutNav - showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
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
