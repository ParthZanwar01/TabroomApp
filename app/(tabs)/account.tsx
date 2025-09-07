import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/contexts/ThemeContext';
import { backendCookieLogin, backendFetchBallots, backendFetchBallotsBySession, backendSessionLogin, clearApiKey, fetchMyProfile, getStoredSession, hasApiKeyConfigured, isApiConfigured, login, logout, saveApiKeyAndSecret, saveApiKeyBase64 } from '@/lib/api/tabroom';
import { useRouter } from 'expo-router';

export default function AccountScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<any | undefined>(undefined);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiBasic, setApiBasic] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [cookieToken, setCookieToken] = useState<string | undefined>(undefined);
  const [ballotsPreview, setBallotsPreview] = useState<string | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessionPreview, setSessionPreview] = useState<string | undefined>(undefined);
  const router = useRouter();
  const { isDark, toggleTheme, colors } = useTheme();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setHasKey(await hasApiKeyConfigured());
      const session = await getStoredSession();
      if (session && mounted) {
        await refreshProfile();
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function refreshProfile() {
    setLoading(true);
    setError(undefined);
    try {
      const me = await fetchMyProfile();
      setProfile(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
      setProfile(undefined);
    } finally {
      setLoading(false);
    }
  }

  async function onLogin() {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    setError(undefined);
    try {
      await login(username.trim(), password);
      setPassword('');
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
          await logout();
          setProfile(undefined);
        }}
      ]
    );
  }

  const handleClearApiKey = async () => {
    Alert.alert(
      'Clear API Key',
      'Are you sure you want to clear your API key? This will log you out.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: async () => {
          await clearApiKey();
          setHasKey(false);
        }}
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Account</ThemedText>
          <ThemedText style={styles.subtitle}>
            Manage your debate tournament account
          </ThemedText>
        </View>

        {/* Theme Settings */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Appearance</ThemedText>
          <View style={styles.themeCard}>
            <View style={styles.themeRow}>
              <View style={styles.themeInfo}>
                <ThemedText style={styles.themeTitle}>Dark Theme</ThemedText>
                <ThemedText style={styles.themeDescription}>
                  Switch between light and dark appearance
                </ThemedText>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
                thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            <View style={styles.themePreview}>
              <View style={[styles.themePreviewItem, { backgroundColor: colors.background }]}>
                <ThemedText style={[styles.themePreviewText, { color: colors.text }]}>
                  {isDark ? '🌙' : '☀️'} {isDark ? 'Dark' : 'Light'} Mode
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {!isApiConfigured() && !hasKey ? (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>API Configuration</ThemedText>
            <View style={styles.card}>
              <ThemedText style={styles.cardText}>
                API key required for login. Set EXPO_PUBLIC_TABROOM_API_BASIC (base64 of key:secret) or add expo.extra.tabroomApiBasic in app.json, then restart the app.
              </ThemedText>
              <ThemedText style={styles.cardText}>Or enter and save it securely here:</ThemedText>
              
              <View style={styles.inputGroup}>
                <TextInput
                  placeholder="API Key"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={apiKey}
                  onChangeText={setApiKey}
                  style={styles.input}
                />
                <TextInput
                  placeholder="API Secret"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={apiSecret}
                  onChangeText={setApiSecret}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Basic (base64 of key:secret)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={apiBasic}
                  onChangeText={setApiBasic}
                  style={styles.input}
                />
              </View>
              
              <View style={styles.buttonRow}>
                <Pressable 
                  style={styles.secondaryButton} 
                  onPress={async () => { 
                    await saveApiKeyAndSecret(apiKey, apiSecret); 
                    setHasKey(true); 
                  }}
                >
                  <ThemedText style={styles.secondaryButtonText}>Save Key+Secret</ThemedText>
                </Pressable>
                <Pressable 
                  style={styles.secondaryButton} 
                  onPress={async () => { 
                    await saveApiKeyBase64(apiBasic); 
                    setHasKey(true); 
                  }}
                >
                  <ThemedText style={styles.secondaryButtonText}>Save Base64</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {profile ? (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Profile</ThemedText>
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  <ThemedText style={styles.profileInitials}>
                    {profile?.first?.[0]}{profile?.last?.[0]}
                  </ThemedText>
                </View>
                <View style={styles.profileInfo}>
                  <ThemedText type="subtitle" style={styles.profileName}>
                    {profile?.first} {profile?.last}
                  </ThemedText>
                  <ThemedText style={styles.profileEmail}>{profile?.email}</ThemedText>
                </View>
              </View>
              
              <View style={styles.profileActions}>
                <Pressable style={styles.dangerButton} onPress={handleClearApiKey}>
                  <ThemedText style={styles.dangerButtonText}>Clear API Key</ThemedText>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={onLogout}>
                  <ThemedText style={styles.primaryButtonText}>Log out</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Login</ThemedText>
            <View style={styles.loginCard}>
              <View style={styles.inputGroup}>
                <TextInput
                  placeholder="Email or Username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                />
              </View>
              
              <Pressable 
                style={styles.primaryButton} 
                onPress={onLogin} 
                disabled={loading}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {loading ? 'Logging in...' : 'Log in'}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Alternative Login Methods</ThemedText>
              
              <View style={styles.methodCard}>
                <ThemedText style={styles.methodTitle}>Website Login (Cookie)</ThemedText>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={async () => {
                    setLoading(true);
                    setError(undefined);
                    try {
                      const { token } = await backendCookieLogin(username.trim(), password);
                      setCookieToken(token);
                      const html = await backendFetchBallots(token);
                      setBallotsPreview(html.slice(0, 500));
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Website login failed');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <ThemedText style={styles.secondaryButtonText}>Try Cookie Login</ThemedText>
                </Pressable>
              </View>

              <View style={styles.methodCard}>
                <ThemedText style={styles.methodTitle}>Website Login (Session)</ThemedText>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={async () => {
                    setLoading(true);
                    setError(undefined);
                    try {
                      const { sessionId } = await backendSessionLogin(username.trim(), password);
                      setSessionId(sessionId);
                      const html = await backendFetchBallotsBySession(sessionId);
                      setSessionPreview(html.slice(0, 500));
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Session login failed');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <ThemedText style={styles.secondaryButtonText}>Try Session Login</ThemedText>
                </Pressable>
              </View>

              <View style={styles.methodCard}>
                <ThemedText style={styles.methodTitle}>Terminal Login</ThemedText>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => router.push('/login/terminal')}
                >
                  <ThemedText style={styles.secondaryButtonText}>Open Terminal</ThemedText>
                </Pressable>
              </View>
            </View>

            {cookieToken && (
              <View style={styles.tokenCard}>
                <ThemedText style={styles.tokenTitle}>Cookie Token Active</ThemedText>
                <ThemedText style={styles.tokenText}>{cookieToken.slice(0, 12)}…</ThemedText>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.push({ pathname: '/ballots/[token]', params: { token: cookieToken } })}
                >
                  <ThemedText style={styles.primaryButtonText}>Open Ballots</ThemedText>
                </Pressable>
              </View>
            )}

            {sessionId && (
              <View style={styles.tokenCard}>
                <ThemedText style={styles.tokenTitle}>Session Active</ThemedText>
                <ThemedText style={styles.tokenText}>{sessionId.slice(0, 8)}…</ThemedText>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.push({ pathname: '/ballots/session/[sessionId]', params: { sessionId } })}
                >
                  <ThemedText style={styles.primaryButtonText}>Open Ballots (Session)</ThemedText>
                </Pressable>
              </View>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <ThemedText style={styles.loadingText}>Processing...</ThemedText>
              </View>
            )}

            {error && (
              <View style={styles.errorCard}>
                <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}
          </View>
        )}
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
  themeCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeInfo: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  themePreview: {
    alignItems: 'center',
  },
  themePreviewItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  themePreviewText: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  inputGroup: {
    gap: 12,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  profileCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  profileActions: {
    gap: 12,
  },
  loginCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 20,
  },
  methodCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 12,
  },
  tokenTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenText: {
    fontSize: 14,
    fontFamily: 'monospace',
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  errorCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorIcon: {
    fontSize: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
  },
});


