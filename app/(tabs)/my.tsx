import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { fetchActiveTournaments, type ActiveTournament } from '@/lib/api/tabroom';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';

export default function MyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<ActiveTournament[]>([]);

  // Move all hooks to the top - they must be called in the same order every render
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

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
        <ThemedText>No tournaments found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={[styles.title, { color: textColor }]}>
          My Tournaments
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
          {items.length} tournament{items.length !== 1 ? 's' : ''} found
        </ThemedText>
      </View>
      
      <FlatList
        data={items}
        keyExtractor={(it, idx) => it.id || String(idx)}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable 
            style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]} 
            onPress={() => item.url && Linking.openURL(item.url)}
            android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
          >
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle" style={[styles.tournamentName, { color: textColor }]}>
                {item.name}
              </ThemedText>
              {item.status && (
                <View style={[
                  styles.statusBadge,
                  { 
                    backgroundColor: item.status === 'Confirmed' ? '#10B981' + '20' : 
                                   item.status === 'Waitlisted' ? '#F59E0B' + '20' : '#6B7280' + '20'
                  }
                ]}>
                  <ThemedText style={[
                    styles.statusText,
                    { 
                      color: item.status === 'Confirmed' ? '#10B981' : 
                             item.status === 'Waitlisted' ? '#F59E0B' : '#6B7280'
                    }
                  ]}>
                    {item.status}
                  </ThemedText>
                </View>
              )}
            </View>
            
            {item.dateIso && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoIcon}>📅</ThemedText>
                <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>
                  {new Date(item.dateIso).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </ThemedText>
              </View>
            )}
            
            {item.event && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoIcon}>🏆</ThemedText>
                <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>
                  {item.event}
                </ThemedText>
              </View>
            )}
          </Pressable>
        )}
      />
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
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tournamentName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
});


