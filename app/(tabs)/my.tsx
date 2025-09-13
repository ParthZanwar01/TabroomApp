import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fetchActiveTournaments, type ActiveTournament } from '@/lib/api/tabroom';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';

export default function MyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<ActiveTournament[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const data = await fetchActiveTournaments();
        if (isMounted) setItems(data);
      } catch (e) {
        if (isMounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 8 }}>Loading your tournaments…</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{error}</ThemedText>
        <View style={{ height: 12 }} />
        <ThemedText onPress={() => router.push('/(tabs)/account')}>Tap to log in again</ThemedText>
      </ThemedView>
    );
  }

  if (items.length === 0) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>No active tournaments.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1, padding: 12 }}>
      <FlatList
        data={items}
        keyExtractor={(it, idx) => it.id || String(idx)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => item.url && Linking.openURL(item.url)}>
            <ThemedText type="subtitle" style={{ marginBottom: 4 }}>{item.name}</ThemedText>
            {item.dateIso ? <ThemedText style={{ opacity: 0.8 }}>{new Date(item.dateIso).toLocaleDateString()}</ThemedText> : null}
            {item.event ? <ThemedText style={{ opacity: 0.8 }}>{item.event}</ThemedText> : null}
            {item.status ? <ThemedText style={{ opacity: 0.8 }}>{item.status}</ThemedText> : null}
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});


