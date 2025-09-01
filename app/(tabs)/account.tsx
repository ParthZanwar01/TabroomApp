import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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
    await logout();
    setProfile(undefined);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Account</ThemedText>
      {!isApiConfigured() && !hasKey ? (
        <View style={styles.card}>
          <ThemedText>
            API key required for login. Set EXPO_PUBLIC_TABROOM_API_BASIC (base64 of key:secret) or add expo.extra.tabroomApiBasic in app.json, then restart the app.
          </ThemedText>
          <ThemedText style={{ marginTop: 8 }}>Or enter and save it securely here:</ThemedText>
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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.button} onPress={async () => { await saveApiKeyAndSecret(apiKey, apiSecret); setHasKey(true); }}>
              <ThemedText type="defaultSemiBold">Save Key+Secret</ThemedText>
            </Pressable>
            <Pressable style={styles.button} onPress={async () => { await saveApiKeyBase64(apiBasic); setHasKey(true); }}>
              <ThemedText type="defaultSemiBold">Save Base64</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
      {profile ? (
        <View style={styles.card}>
          <ThemedText type="subtitle">{profile?.first} {profile?.last}</ThemedText>
          <ThemedText>{profile?.email}</ThemedText>
          <Pressable style={styles.button} onPress={async () => { await clearApiKey(); setHasKey(false); }}>
            <ThemedText type="defaultSemiBold">Clear API Key</ThemedText>
          </Pressable>
          <Pressable style={styles.button} onPress={onLogout}>
            <ThemedText type="defaultSemiBold">Log out</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
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
          <Pressable style={styles.button} onPress={onLogin} disabled={loading}>
            <ThemedText type="defaultSemiBold">Log in</ThemedText>
          </Pressable>
          <Pressable
            style={styles.button}
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
            <ThemedText type="defaultSemiBold">Website Login (Cookie)</ThemedText>
          </Pressable>
          <Pressable
            style={styles.button}
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
            <ThemedText type="defaultSemiBold">Website Login (Session)</ThemedText>
          </Pressable>
          {cookieToken ? (
            <Pressable
              style={styles.button}
              onPress={() => router.push({ pathname: '/ballots/[token]', params: { token: cookieToken } })}
            >
              <ThemedText type="defaultSemiBold">Open Ballots</ThemedText>
            </Pressable>
          ) : null}
          {sessionId ? (
            <Pressable
              style={styles.button}
              onPress={() => router.push({ pathname: '/ballots/session/[sessionId]', params: { sessionId } })}
            >
              <ThemedText type="defaultSemiBold">Open Ballots (Session)</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.button}
            onPress={() => router.push('/login/terminal')}
          >
            <ThemedText type="defaultSemiBold">Open Terminal Login</ThemedText>
          </Pressable>
          {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
          {error ? <ThemedText>{error}</ThemedText> : null}
          {cookieToken ? <ThemedText>Cookie token saved (not persisted): {cookieToken.slice(0, 12)}…</ThemedText> : null}
          {ballotsPreview ? <ThemedText>{ballotsPreview}</ThemedText> : null}
          {sessionId ? <ThemedText>Session started: {sessionId.slice(0, 8)}…</ThemedText> : null}
          {sessionPreview ? <ThemedText>{sessionPreview}</ThemedText> : null}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  form: {
    gap: 10,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    gap: 6,
  },
});


