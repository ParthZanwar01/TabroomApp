import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fetchTournamentByIdSmart as fetchTournamentById, type TournamentDetail } from '@/lib/api/tabroom';

export default function TournamentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  const openWebsite = () => {
    if (tournament?.websiteUrl) {
      Linking.openURL(tournament.websiteUrl);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <ThemedText style={styles.loadingText}>Loading tournament details...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (errorMessage) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
          <ThemedText type="subtitle" style={styles.errorTitle}>Error Loading Tournament</ThemedText>
          <ThemedText style={styles.errorMessage}>{errorMessage}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <ThemedText style={styles.retryButtonText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (!tournament) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorIcon}>❓</ThemedText>
          <ThemedText type="subtitle" style={styles.errorTitle}>Tournament Not Found</ThemedText>
          <ThemedText style={styles.errorMessage}>
            The tournament you&apos;re looking for doesn&apos;t exist or has been removed.
          </ThemedText>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <ThemedText style={styles.retryButtonText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerBackground}>
            <ThemedText type="title" style={styles.tournamentName}>
              {tournament.name}
            </ThemedText>
            
            {tournament.location && (
              <View style={styles.locationRow}>
                <ThemedText style={styles.locationIcon}>📍</ThemedText>
                <ThemedText style={styles.locationText}>{tournament.location}</ThemedText>
              </View>
            )}
            
            <View style={styles.dateRow}>
              <ThemedText style={styles.dateIcon}>📅</ThemedText>
              <ThemedText style={styles.dateText}>
                {[tournament.startDate, tournament.endDate]
                  .filter(Boolean)
                  .map((dateString) => formatDate(dateString!))
                  .join(' — ')}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        {tournament.websiteUrl && (
          <View style={styles.actionsSection}>
            <Pressable style={styles.websiteButton} onPress={openWebsite}>
              <ThemedText style={styles.websiteButtonText}>🌐 Visit Website</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Events Section */}
        {tournament.events && tournament.events.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Events ({tournament.events.length})
            </ThemedText>
            <View style={styles.eventsContainer}>
              {tournament.events.map((event: any, index: number) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <View style={styles.eventNumber}>
                      <ThemedText style={styles.eventNumberText}>{index + 1}</ThemedText>
                    </View>
                    <ThemedText type="subtitle" style={styles.eventName}>
                      {event.name}
                    </ThemedText>
                  </View>
                  {event.description && (
                    <ThemedText style={styles.eventDescription}>
                      {event.description}
                    </ThemedText>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Additional Info Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Tournament Information</ThemedText>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Tournament ID</ThemedText>
              <ThemedText style={styles.infoValue}>{tournament.id}</ThemedText>
            </View>
            {tournament.startDate && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Start Date</ThemedText>
                <ThemedText style={styles.infoValue}>{formatDate(tournament.startDate)}</ThemedText>
              </View>
            )}
            {tournament.endDate && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>End Date</ThemedText>
                <ThemedText style={styles.infoValue}>{formatDate(tournament.endDate)}</ThemedText>
              </View>
            )}
            {tournament.websiteUrl && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Website</ThemedText>
                <ThemedText style={styles.infoValue} numberOfLines={1}>
                  {tournament.websiteUrl}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Tournament data provided by Tabroom
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerBackground: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 32,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tournamentName: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 36,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  locationText: {
    fontSize: 16,
    opacity: 0.8,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
    opacity: 0.8,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  websiteButton: {
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  websiteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  eventsContainer: {
    gap: 12,
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  eventNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
    marginLeft: 44,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  errorMessage: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});


