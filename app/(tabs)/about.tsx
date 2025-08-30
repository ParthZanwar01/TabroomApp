import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getSystemStatus } from '@/lib/api/tabroom';

export default function AboutScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Record<string, any> | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const data = await getSystemStatus();
        if (mounted) setStatus(data);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load status');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">About</ThemedText>
      <ThemedText>Tabroom connectivity and system status.</ThemedText>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : error ? (
        <ThemedText>{error}</ThemedText>
      ) : (
        <View style={styles.statusBox}>
          <ThemedText type="subtitle">Status</ThemedText>
          <ThemedText>{JSON.stringify(status ?? {}, null, 2)}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  statusBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});


