import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import ParticlesBackground from '@/components/ParticlesBackground';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const primaryColor = useThemeColor({}, 'primary');
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

  return (
    <ParticlesBackground>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.hero}>
            <ThemedText type="title" style={[styles.heroTitle, { color: textColor }]}>
              {isAuthenticated ? 'Welcome Back!' : 'Tabroom App'}
            </ThemedText>
            <ThemedText style={[styles.heroSubtitle, { color: textSecondaryColor }]}>
              {isAuthenticated 
                ? 'Manage your tournaments and stay updated'
                : 'Connect to Tabroom and explore tournaments'
              }
            </ThemedText>
          </View>

          {/* Quick Actions */}
          <View style={styles.actions}>
            {isAuthenticated ? (
              <>
                <Pressable 
                  style={[styles.primaryButton, { backgroundColor: primaryColor }]} 
                  onPress={() => router.push('/(tabs)/my')}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                    My Tournaments
                  </ThemedText>
                </Pressable>
                
                <Pressable 
                  style={[styles.secondaryButton, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]} 
                  onPress={() => router.push('/(tabs)/tournaments')}
                  android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                >
                  <ThemedText type="defaultSemiBold" style={[styles.secondaryButtonText, { color: textColor }]}>
                    Browse All
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable 
                  style={[styles.primaryButton, { backgroundColor: primaryColor }]} 
                  onPress={() => router.push('/(tabs)/account')}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                    Sign In
                  </ThemedText>
                </Pressable>
                
                <Pressable 
                  style={[styles.secondaryButton, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]} 
                  onPress={() => router.push('/(tabs)/tournaments')}
                  android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                >
                  <ThemedText type="defaultSemiBold" style={[styles.secondaryButtonText, { color: textColor }]}>
                    Browse Tournaments
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>

          {/* Features Grid */}
          <View style={styles.featuresGrid}>
            <Pressable 
              style={[styles.featureCard, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}
              onPress={() => router.push('/(tabs)/my')}
              android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            >
              <View style={[styles.featureIcon, { backgroundColor: primaryColor + '15' }]}>
                <ThemedText style={styles.featureIconText}>📋</ThemedText>
              </View>
              <ThemedText type="subtitle" style={[styles.featureTitle, { color: textColor }]}>
                My Tournaments
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                View your registered tournaments
              </ThemedText>
            </Pressable>

            <Pressable 
              style={[styles.featureCard, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}
              onPress={() => router.push('/(tabs)/tournaments')}
              android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            >
              <View style={[styles.featureIcon, { backgroundColor: primaryColor + '15' }]}>
                <ThemedText style={styles.featureIconText}>🔍</ThemedText>
              </View>
              <ThemedText type="subtitle" style={[styles.featureTitle, { color: textColor }]}>
                Search
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                Find tournaments by name or location
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </ThemedView>
    </ParticlesBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 50,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 320,
    opacity: 0.8,
  },
  actions: {
    gap: 20,
    marginBottom: 50,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  featureCard: {
    flex: 1,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureIconText: {
    fontSize: 28,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  featureDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
});
