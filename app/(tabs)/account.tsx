import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function AccountScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [cookieToken, setCookieToken] = useState<string | undefined>(undefined);
  const [stages, setStages] = useState<string[]>([]);

  function addStage(msg: string) {
    setStages(prev => [...prev, msg]);
  }

  async function onCookieLogin() {
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
        setLoading(false);
        return;
      }

      addStage('Received sessionId');
      setCookieToken(sessionId);
      try {
        // Persist for later requests
        await import('@/lib/api/tabroom').then(m => m.storeBackendSessionId(sessionId!));
        addStage('Stored sessionId');
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Website login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Account</ThemedText>
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
        <Pressable style={styles.button} onPress={onCookieLogin} disabled={loading}>
          <ThemedText type="defaultSemiBold">Website Login (Cookie)</ThemedText>
        </Pressable>
        {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
        {error ? <ThemedText>{error}</ThemedText> : null}
        {cookieToken ? <ThemedText>Cookie active</ThemedText> : null}
        {stages.length > 0 ? (
          <View style={styles.stages}>
            {stages.map((s, i) => (
              <ThemedText key={i}>{`• ${s}`}</ThemedText>
            ))}
          </View>
        ) : null}
      </View>
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
    marginTop: 12,
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
  stages: {
    gap: 6,
    marginTop: 12,
  },
});


