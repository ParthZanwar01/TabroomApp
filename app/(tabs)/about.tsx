import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const formatStatusValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? '✅ Yes' : '❌ No';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return JSON.stringify(value);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>About</ThemedText>
          <ThemedText style={styles.subtitle}>
            Tabroom connectivity and system status
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>App Information</ThemedText>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>App Name</ThemedText>
              <ThemedText style={styles.infoValue}>Debate Tournaments</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Version</ThemedText>
              <ThemedText style={styles.infoValue}>1.0.0</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Platform</ThemedText>
              <ThemedText style={styles.infoValue}>React Native + Expo</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>API</ThemedText>
              <ThemedText style={styles.infoValue}>Tabroom Integration</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Features</ThemedText>
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <ThemedText style={styles.featureIcon}>🏆</ThemedText>
              <ThemedText style={styles.featureTitle}>Tournaments</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Browse and search debate tournaments
              </ThemedText>
            </View>
            <View style={styles.featureCard}>
              <ThemedText style={styles.featureIcon}>🔍</ThemedText>
              <ThemedText style={styles.featureTitle}>Smart Search</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Find tournaments by name, location, or date
              </ThemedText>
            </View>
            <View style={styles.featureCard}>
              <ThemedText style={styles.featureIcon}>📱</ThemedText>
              <ThemedText style={styles.featureTitle}>Mobile First</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Optimized for mobile devices
              </ThemedText>
            </View>
            <View style={styles.featureCard}>
              <ThemedText style={styles.featureIcon}>🔐</ThemedText>
              <ThemedText style={styles.featureTitle}>Secure</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Secure API authentication
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>System Status</ThemedText>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <ThemedText style={styles.loadingText}>Checking system status...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
              <ThemedText type="subtitle" style={styles.errorTitle}>Status Check Failed</ThemedText>
              <ThemedText style={styles.errorMessage}>{error}</ThemedText>
            </View>
          ) : status ? (
            <View style={styles.statusCard}>
              {Object.entries(status).map(([key, value]) => (
                <View key={key} style={styles.statusRow}>
                  <ThemedText style={styles.statusLabel}>{key}</ThemedText>
                  <ThemedText style={styles.statusValue}>
                    {formatStatusValue(value)}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Links</ThemedText>
          <View style={styles.linksContainer}>
            <Pressable 
              style={styles.linkCard}
              onPress={() => openLink('https://www.tabroom.com')}
            >
              <View style={styles.linkBackground}>
                <ThemedText style={styles.linkIcon}>🌐</ThemedText>
                <ThemedText style={styles.linkTitle}>Tabroom Website</ThemedText>
                <ThemedText style={styles.linkDescription}>
                  Visit the official Tabroom website
                </ThemedText>
              </View>
            </Pressable>
            
            <Pressable 
              style={styles.linkCard}
              onPress={() => openLink('https://github.com')}
            >
              <View style={styles.linkBackgroundSecondary}>
                <ThemedText style={styles.linkIcon}>📚</ThemedText>
                <ThemedText style={styles.linkTitle}>Documentation</ThemedText>
                <ThemedText style={styles.linkDescription}>
                  View app documentation
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Made with ❤️ for the debate community
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
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
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    gap: 12,
  },
  errorIcon: {
    fontSize: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    opacity: 0.8,
  },
  statusCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  linksContainer: {
    gap: 12,
  },
  linkCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  linkBackground: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkBackgroundSecondary: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkIcon: {
    fontSize: 32,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkDescription: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    padding: 20,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
});


