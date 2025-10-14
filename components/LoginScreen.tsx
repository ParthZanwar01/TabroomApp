import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { fetchDashboardData, fetchUserTournaments } from '@/lib/api/tabroom';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

export function LoginScreen() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [stages, setStages] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const placeholderColor = useThemeColor({ light: 'rgba(0,0,0,0.5)', dark: 'rgba(255,255,255,0.5)' }, 'text');

  function addStage(msg: string) {
    setStages(prev => [...prev, msg]);
  }

  async function onLogin() {
    if (!username.trim() || !password.trim()) {
      setError('Enter email/username and password');
      return;
    }
    setLoading(true);
    setError(undefined);
    setStages([]);
    
    try {
      const configured = (Constants.expoConfig?.extra as { nodePupBaseUrl?: string } | undefined)?.nodePupBaseUrl || process.env.EXPO_PUBLIC_NODE_PUP_BASE_URL;
      const candidates = [
        configured,
        'http://127.0.0.1:3000/',
        'http://localhost:3000/',
      ].filter(Boolean) as string[];

      let sessionId: string | undefined;
      for (const base of candidates) {
        const baseUrl = base.endsWith('/') ? base : base + '/';
        addStage(`POST ${baseUrl}login`);
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          const res = await fetch(new URL('login', baseUrl).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim(), password }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          addStage(`Status ${res.status}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.sessionId) {
              sessionId = data.sessionId;
              addStage(`Got sessionId: ${sessionId?.substring(0, 8)}...`);
              // Store the session ID for later use
              try {
                const { setBackendSessionId } = await import('@/lib/api/tabroom');
                await setBackendSessionId(sessionId!);
                addStage('Session ID stored');
              } catch (e) {
                addStage(`Storage error: ${e}`);
              }
              break;
            }
          } else {
            const text = await res.text().catch(() => '');
            addStage(`Response: ${text || res.status}`);
          }
        } catch (e) {
          addStage(`Network error: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (!sessionId) {
        setError('Login failed: backend unreachable or credentials invalid');
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      addStage('Received sessionId');
      try {
        // Persist for later requests
        await import('@/lib/api/tabroom').then(m => m.storeBackendSessionId(sessionId!));
        addStage('Stored sessionId');
        
        // Update auth context
        login();
        
        // Navigate to main app
        router.replace('/(tabs)');
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }

  // If already authenticated, show the main app
  if (isAuthenticated) {
    return <MainApp />;
  }

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>Checking authentication...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Show login screen
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={[styles.title, { color: textColor }]}>
            Tabroom App
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textColor }]}>
            Please log in to access your debate tournaments
          </ThemedText>
        </View>

        <View style={styles.form}>
          <TextInput
            placeholder="Email or Username"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            style={[styles.input, { 
              backgroundColor: cardBackgroundColor, 
              color: textColor, 
              borderColor: borderColor 
            }]}
            placeholderTextColor={placeholderColor}
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { 
              backgroundColor: cardBackgroundColor, 
              color: textColor, 
              borderColor: borderColor 
            }]}
            placeholderTextColor={placeholderColor}
          />
          <Pressable style={[styles.button, { backgroundColor: tintColor }]} onPress={onLogin} disabled={loading}>
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              {loading ? 'Logging in...' : 'Login to Tabroom'}
            </ThemedText>
          </Pressable>
          
          {loading && <ActivityIndicator style={{ marginTop: 16 }} color={tintColor} />}
          {error && <ThemedText style={[styles.errorText, { color: '#EF4444' }]}>{error}</ThemedText>}
        </View>

        {stages.length > 0 && (
          <View style={[styles.stages, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
            <ThemedText style={[styles.stagesTitle, { color: textColor }]}>Login Progress:</ThemedText>
            {stages.map((s, i) => (
              <ThemedText key={i} style={[styles.stageText, { color: textColor }]}>{`• ${s}`}</ThemedText>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
            <ThemedText type="subtitle" style={[styles.modalTitle, { color: textColor }]}>
              Login Failed
            </ThemedText>
            <ThemedText style={[styles.modalMessage, { color: textColor }]}>
              Invalid username or password. Please check your credentials and try again.
            </ThemedText>
            <Pressable 
              style={[styles.modalButton, { backgroundColor: tintColor }]}
              onPress={() => {
                setShowErrorModal(false);
                setError(undefined);
              }}
            >
              <ThemedText type="defaultSemiBold" style={styles.modalButtonText}>
                OK
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

// Main app component that shows after login
function MainApp() {
  const { logout } = useAuth();
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setDataLoading(true);
        setDataError(null);
        
        const [dashboard] = await Promise.all([
          fetchDashboardData(),
          fetchUserTournaments()
        ]);
        
        setDashboardData(dashboard);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setDataError('Failed to load data from Tabroom');
        // Set fallback data
        setDashboardData({
          user_name: 'User',
          stats: { active_tournaments: 0, upcoming_rounds: 0, ballots_to_judge: 0, reminders: 0 },
          recent_activity: []
        });
      } finally {
        setDataLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setDataLoading(true);
      setDataError(null);
      
      const [dashboard] = await Promise.all([
        fetchDashboardData(),
        fetchUserTournaments()
      ]);
      
      setDashboardData(dashboard);
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
      setDataError('Failed to refresh data from Tabroom');
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  };

  if (dataLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>
            Loading your Tabroom data...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const stats = dashboardData?.stats || { active_tournaments: 0, upcoming_rounds: 0, ballots_to_judge: 0, reminders: 0 };
  const recentActivity = dashboardData?.recent_activity || [];
  const userName = dashboardData?.user_name || 'User';
  
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tintColor}
          />
        }
      >
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <View style={styles.headerContent}>
            <View>
              <ThemedText type="title" style={[styles.dashboardTitle, { color: textColor }]}>
                Welcome, {userName}!
              </ThemedText>
              <ThemedText style={[styles.dashboardSubtitle, { color: textColor }]}>
                Your debate tournament hub
              </ThemedText>
            </View>
            <Pressable 
              style={[styles.refreshButton, { backgroundColor: tintColor }]}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <ThemedText style={styles.refreshButtonText}>
                {refreshing ? '⟳' : '↻'} Refresh
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {dataError && (
          <View style={[styles.errorContainer, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
            <ThemedText style={[styles.errorText, { color: textColor }]}>
              ⚠️ {dataError}
            </ThemedText>
          </View>
        )}

        {/* Quick Stats */}
        <View style={[styles.statsContainer, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
          <ThemedText type="defaultSemiBold" style={[styles.statsTitle, { color: textColor }]}>
            Quick Stats
          </ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="title" style={[styles.statNumber, { color: tintColor }]}>
                {stats.active_tournaments}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textColor }]}>Active Tournaments</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={[styles.statNumber, { color: tintColor }]}>
                {stats.upcoming_rounds}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textColor }]}>Upcoming Rounds</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={[styles.statNumber, { color: tintColor }]}>
                {stats.ballots_to_judge}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textColor }]}>Ballots to Judge</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={[styles.statNumber, { color: tintColor }]}>
                {stats.reminders}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textColor }]}>Reminders</ThemedText>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.actionsContainer, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
          <ThemedText type="defaultSemiBold" style={[styles.actionsTitle, { color: textColor }]}>
            Quick Actions
          </ThemedText>
          <View style={styles.actionButtons}>
            <Pressable 
              style={[styles.actionButton, { backgroundColor: tintColor }]}
              onPress={() => router.push('/(tabs)/my')}
            >
              <ThemedText style={styles.actionButtonText}>📋 My Tournaments</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.actionButton, { backgroundColor: tintColor }]}
              onPress={() => router.push('/(tabs)/tournaments')}
            >
              <ThemedText style={styles.actionButtonText}>🏆 Tournaments</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.actionButton, { backgroundColor: tintColor }]}
              onPress={() => router.push('/(tabs)/my')}
            >
              <ThemedText style={styles.actionButtonText}>⏰ Schedule</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.actionButton, { backgroundColor: tintColor }]}
              onPress={() => router.push('/(tabs)/tournaments')}
            >
              <ThemedText style={styles.actionButtonText}>📊 Results</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={[styles.activityContainer, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
          <ThemedText type="defaultSemiBold" style={[styles.activityTitle, { color: textColor }]}>
            Recent Activity
          </ThemedText>
          <View style={styles.activityList}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity: any, index: number) => (
                <View key={index} style={styles.activityItem}>
                  <ThemedText style={[styles.activityTime, { color: textColor }]}>
                    {activity.time || 'Recently'}
                  </ThemedText>
                  <ThemedText style={[styles.activityText, { color: textColor }]}>
                    {activity.text}
                  </ThemedText>
                </View>
              ))
            ) : (
              <View style={styles.activityItem}>
                <ThemedText style={[styles.activityText, { color: textColor }]}>
                  No recent activity found
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Pressable style={[styles.logoutButton, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]} onPress={logout}>
            <ThemedText type="defaultSemiBold" style={styles.logoutButtonText}>
              Logout
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  stages: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  stagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  stageText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  // Dashboard styles
  dashboardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  dashboardSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  statsContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  actionsContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  actionsTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activityContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  activityTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  activityTime: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 20,
  },
  logoutContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 16,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    minWidth: 300,
    maxWidth: 400,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
