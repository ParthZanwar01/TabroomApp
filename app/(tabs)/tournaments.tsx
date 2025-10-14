import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { listUpcomingTournaments, searchTournaments, type TournamentSummary } from '@/lib/api/tabroom';

export default function TournamentsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
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

  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');

  const renderItem = useCallback(({ item }: { item: TournamentSummary }) => {
    return (
      <Pressable 
        onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: item.id } })}
        style={styles.cardContainer}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      >
        <View style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={[styles.tournamentName, { color: textColor }]}>
              {item.name}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: primaryColor + '20' }]}>
              <ThemedText style={[styles.statusText, { color: primaryColor }]}>Upcoming</ThemedText>
            </View>
          </View>
          
          {item.location && (
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoIcon}>📍</ThemedText>
              <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>{item.location}</ThemedText>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoIcon}>📅</ThemedText>
            <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>
              {[item.startDate, item.endDate].filter(Boolean).join(' — ')}
            </ThemedText>
          </View>
          
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoIcon}>🌐</ThemedText>
            <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>Online Tournament</ThemedText>
          </View>
          
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoIcon}>📝</ThemedText>
            <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>Registration: Closed</ThemedText>
          </View>
          
          <View style={styles.cardFooter}>
            <ThemedText style={[styles.viewDetails, { color: primaryColor }]}>View Details →</ThemedText>
          </View>
        </View>
      </Pressable>
    );
  }, [router, cardBackgroundColor, borderColor, textColor, textSecondaryColor, primaryColor]);

  const keyExtractor = useCallback((item: TournamentSummary) => item.id, []);

  const header = useMemo(() => (
    <View style={styles.header}>
      <View style={styles.titleSection}>
        <ThemedText type="title" style={[styles.title, { color: textColor }]}>
          Browse Tournaments
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
          Discover upcoming debate tournaments
        </ThemedText>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search tournaments..."
          placeholderTextColor={textSecondaryColor}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => load()}
          style={[styles.searchInput, { 
            backgroundColor: cardBackgroundColor, 
            borderColor: borderColor, 
            color: textColor 
          }]}
          returnKeyType="search"
        />
        <Pressable onPress={() => load()} style={[styles.searchButton, { backgroundColor: primaryColor }]}>
          <ThemedText style={styles.searchButtonText}>Search</ThemedText>
        </Pressable>
      </View>
      
      {query.trim().length > 0 && (
        <View style={styles.resultsInfo}>
          <ThemedText style={[styles.resultsText, { color: textSecondaryColor }]}>
            {data.length} tournament{data.length !== 1 ? 's' : ''} found
          </ThemedText>
        </View>
      )}
    </View>
  ), [query, load, data.length, textColor, textSecondaryColor, primaryColor, cardBackgroundColor, borderColor]);

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
    padding: 24,
    paddingBottom: 16,
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  searchButton: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  resultsInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 15,
    fontWeight: '500',
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
    padding: 24,
    paddingBottom: 32,
  },
  cardContainer: {
    marginBottom: 20,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  tournamentName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  viewDetails: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
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


