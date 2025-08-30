import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { listUpcomingTournaments, searchTournaments, type TournamentSummary } from '@/lib/api/tabroom';

export default function TournamentsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [data, setData] = useState<TournamentSummary[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const trimmed = query.trim();
      const results = trimmed.length > 0
        ? await searchTournaments(trimmed, 'both')
        : await listUpcomingTournaments();
      setData(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(message);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // Initial load
    load();
  }, [load]);

  const renderItem = useCallback(({ item }: { item: TournamentSummary }) => {
    return (
      <Pressable onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: item.id } })}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">{item.name}</ThemedText>
          {item.location ? <ThemedText>{item.location}</ThemedText> : null}
          <ThemedText>
            {[item.startDate, item.endDate].filter(Boolean).join(' — ')}
          </ThemedText>
        </ThemedView>
      </Pressable>
    );
  }, [router]);

  const keyExtractor = useCallback((item: TournamentSummary) => item.id, []);

  const header = useMemo(() => (
    <View style={styles.header}>
      <TextInput
        placeholder="Search tournaments"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={load}
        style={styles.search}
        returnKeyType="search"
      />
      <Pressable onPress={load} style={styles.searchButton}>
        <ThemedText type="defaultSemiBold">Search</ThemedText>
      </Pressable>
    </View>
  ), [query, load]);

  return (
    <ThemedView style={styles.container}>
      {header}
      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : errorMessage ? (
        <ThemedText>{errorMessage}</ThemedText>
      ) : (
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    alignItems: 'center',
  },
  search: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  loading: {
    marginTop: 24,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginBottom: 10,
  },
});


