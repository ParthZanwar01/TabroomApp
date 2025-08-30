import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Debate Tournaments</ThemedText>
      <ThemedText>Find upcoming tournaments and browse details.</ThemedText>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={() => router.push('/(tabs)/tournaments')}>
          <ThemedText type="defaultSemiBold">Browse Tournaments</ThemedText>
        </Pressable>
        <Pressable style={styles.button} onPress={() => router.push('/(tabs)/tournaments')}>
          <ThemedText type="defaultSemiBold">Search</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
