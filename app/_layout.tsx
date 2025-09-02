import { Stack } from 'expo-router';
import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tournament/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="ballots/[token]" options={{ headerShown: false }} />
        <Stack.Screen name="ballots/session/[sessionId]" options={{ headerShown: false }} />
        <Stack.Screen name="login/terminal" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>
    </ThemeProvider>
  );
}
