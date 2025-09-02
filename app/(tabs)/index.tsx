import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <ThemedText type="title" style={styles.heroTitle}>
            Debate Tournaments
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Find upcoming tournaments and browse details
          </ThemedText>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <ThemedText type="subtitle" style={styles.statNumber}>50+</ThemedText>
            <ThemedText style={styles.statLabel}>Active Tournaments</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText type="subtitle" style={styles.statNumber}>1000+</ThemedText>
            <ThemedText style={styles.statLabel}>Debaters</ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable 
            style={styles.primaryButton} 
            onPress={() => router.push('/(tabs)/tournaments')}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              Browse Tournaments
            </ThemedText>
          </Pressable>
          
          <Pressable 
            style={styles.secondaryButton} 
            onPress={() => router.push('/(tabs)/tournaments')}
            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          >
            <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
              Search Tournaments
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <ThemedText style={styles.featureIconText}>🏆</ThemedText>
            </View>
            <View style={styles.featureContent}>
              <ThemedText type="subtitle">Tournament Details</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Get comprehensive information about debate tournaments
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <ThemedText style={styles.featureIconText}>🔍</ThemedText>
            </View>
            <View style={styles.featureContent}>
              <ThemedText type="subtitle">Smart Search</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Find tournaments by name, location, or date
              </ThemedText>
            </View>
          </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
  actions: {
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureIconText: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
    lineHeight: 20,
  },
});
