import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { listUpcomingTournaments, searchTournaments, type TournamentSummary } from '@/lib/api/tabroom';

export default function TournamentsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [data, setData] = useState<TournamentSummary[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
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
      setIsRefreshing(false);
    }
  }, [query]);

  useEffect(() => {
    // Initial load
    load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    load(true);
  }, [load]);

  const renderItem = useCallback(({ item }: { item: TournamentSummary }) => {
    return (
      <Pressable 
        onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: item.id } })}
        style={styles.cardContainer}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={styles.tournamentName}>
              {item.name}
            </ThemedText>
            <View style={styles.statusBadge}>
              <ThemedText style={styles.statusText}>Active</ThemedText>
            </View>
          </View>
          
          {item.location && (
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoIcon}>📍</ThemedText>
              <ThemedText style={styles.infoText}>{item.location}</ThemedText>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoIcon}>📅</ThemedText>
            <ThemedText style={styles.infoText}>
              {[item.startDate, item.endDate].filter(Boolean).join(' — ')}
            </ThemedText>
          </View>
          
          <View style={styles.cardFooter}>
            <ThemedText style={styles.viewDetails}>View Details →</ThemedText>
          </View>
        </View>
      </Pressable>
    );
  }, [router]);

  const keyExtractor = useCallback((item: TournamentSummary) => item.id, []);

  const header = useMemo(() => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search tournaments..."
          placeholderTextColor="rgba(0,0,0,0.5)"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => load()}
          style={styles.searchInput}
          returnKeyType="search"
        />
        <Pressable onPress={() => load()} style={styles.searchButton}>
          <ThemedText style={styles.searchButtonText}>Search</ThemedText>
        </Pressable>
      </View>
      
      {query.trim().length > 0 && (
        <View style={styles.resultsInfo}>
          <ThemedText style={styles.resultsText}>
            {data.length} tournament{data.length !== 1 ? 's' : ''} found
          </ThemedText>
        </View>
      )}
    </View>
  ), [query, load, data.length]);

  const emptyState = useMemo(() => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyIcon}>🏆</ThemedText>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {query.trim().length > 0 ? 'No tournaments found' : 'No tournaments available'}
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {query.trim().length > 0 
          ? 'Try adjusting your search terms'
          : 'Check back later for upcoming tournaments'
        }
      </ThemedText>
    </View>
  ), [query]);

  return (
    <ThemedView style={styles.container}>
      {header}
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <ThemedText style={styles.loadingText}>Loading tournaments...</ThemedText>
        </View>
      ) : errorMessage ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
          <ThemedText type="subtitle" style={styles.errorTitle}>Error</ThemedText>
          <ThemedText style={styles.errorMessage}>{errorMessage}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => load()}>
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={emptyState}
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchButton: {
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  resultsInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 14,
    opacity: 0.7,
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
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tournamentName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  cardFooter: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  viewDetails: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    gap: 16,
  },
  emptyIcon: {
    fontSize: 64,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
});


