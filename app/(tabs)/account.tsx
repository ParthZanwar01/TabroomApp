import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { fetchActiveTournaments, fetchDashboardData } from '@/lib/api/tabroom';

export default function AccountScreen() {
  const { isAuthenticated, login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activeTournaments, setActiveTournaments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Theme colors
  const primaryColor = useThemeColor({}, 'primary');
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const errorColor = useThemeColor({}, 'error');

  // Load user data after successful login
  const loadUserData = useCallback(async () => {
    try {
      const dashboard = await fetchDashboardData();
      setDashboardData(dashboard);
      
      const tournaments = await fetchActiveTournaments();
      setActiveTournaments(tournaments);
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated, loadUserData]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      await login(username, password);
      setUsername('');
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setDashboardData(null);
    setActiveTournaments([]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  }, [loadUserData]);

  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={[styles.title, { color: textColor }]}>
            Sign In
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
            Connect to your Tabroom account
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: textColor }]}>Email</ThemedText>
            <TextInput
              style={[styles.input, { 
                backgroundColor: cardBackgroundColor, 
                borderColor: borderColor, 
                color: textColor 
              }]}
              placeholder="Enter your email"
              placeholderTextColor={textSecondaryColor}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: textColor }]}>Password</ThemedText>
            <TextInput
              style={[styles.input, { 
                backgroundColor: cardBackgroundColor, 
                borderColor: borderColor, 
                color: textColor 
              }]}
              placeholder="Enter your password"
              placeholderTextColor={textSecondaryColor}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={[styles.errorText, { color: errorColor }]}>
                {error}
              </ThemedText>
            </View>
          )}

          <Pressable
            style={[styles.loginButton, { backgroundColor: primaryColor }]}
            onPress={handleLogin}
            disabled={loading}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
            )}
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.dashboard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={[styles.title, { color: textColor }]}>
            Welcome back!
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
            {dashboardData?.user_name || 'User'}
          </ThemedText>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
            <ThemedText type="subtitle" style={[styles.statNumber, { color: primaryColor }]}>
              {dashboardData?.stats?.active_tournaments || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondaryColor }]}>
              Active Tournaments
            </ThemedText>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
            <ThemedText type="subtitle" style={[styles.statNumber, { color: primaryColor }]}>
              {dashboardData?.stats?.ballots_to_judge || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondaryColor }]}>
              Ballots to Judge
            </ThemedText>
          </View>
        </View>

        {activeTournaments.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>
              Recent Tournaments
            </ThemedText>
            {activeTournaments.slice(0, 3).map((tournament, index) => (
              <View key={index} style={[styles.tournamentItem, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                <ThemedText style={[styles.tournamentName, { color: textColor }]}>
                  {tournament.name}
                </ThemedText>
                {tournament.status && (
                  <ThemedText style={[styles.tournamentStatus, { color: textSecondaryColor }]}>
                    {tournament.status}
                  </ThemedText>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[styles.logoutButton, { borderColor: borderColor }]}
            onPress={handleLogout}
            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          >
            <ThemedText style={[styles.logoutButtonText, { color: textColor }]}>
              Sign Out
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
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
  form: {
    padding: 24,
    paddingTop: 0,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorContainer: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboard: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tournamentItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  tournamentStatus: {
    fontSize: 14,
  },
  actions: {
    padding: 24,
    paddingTop: 0,
  },
  logoutButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});