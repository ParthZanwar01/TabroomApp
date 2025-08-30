import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fetchTournamentById, type TournamentDetail } from '@/lib/api/tabroom';

export default function TournamentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [tournament, setTournament] = useState<TournamentDetail | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!id) return;
      setIsLoading(true);
      setErrorMessage(undefined);
      try {
        const data = await fetchTournamentById(String(id));
        if (isMounted) setTournament(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (isMounted) setErrorMessage(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [id]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (errorMessage) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>{errorMessage}</ThemedText>
      </ThemedView>
    );
  }

  if (!tournament) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">{tournament.name}</ThemedText>
        {tournament.location ? <ThemedText>{tournament.location}</ThemedText> : null}
        <ThemedText>
          {[tournament.startDate, tournament.endDate].filter(Boolean).join(' — ')}
        </ThemedText>
        {tournament.websiteUrl ? (
          <ThemedText
            type="link"
            onPress={() => Linking.openURL(tournament.websiteUrl!)}
          >
            Website
          </ThemedText>
        ) : null}
      </ThemedView>

      {tournament.events && tournament.events.length > 0 ? (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Events</ThemedText>
          {tournament.events.map(ev => (
            <View key={ev.id} style={styles.row}>
              <ThemedText>{ev.name}</ThemedText>
            </View>
          ))}
        </ThemedView>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scroll: {
    padding: 16,
  },
  header: {
    gap: 8,
    marginBottom: 16,
  },
  section: {
    gap: 8,
  },
  row: {
    paddingVertical: 6,
  },
});


