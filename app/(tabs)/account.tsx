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
      const nodeBase = (Constants.expoConfig?.extra as { nodePupBaseUrl?: string } | undefined)?.nodePupBaseUrl || process.env.EXPO_PUBLIC_NODE_PUP_BASE_URL;
      if (!nodeBase) {
        addStage('Backend base URL not configured');
        setError('Backend URL not configured');
        setLoading(false);
        return;
      }

      // Use refactored backend /login which returns { sessionId }
      addStage(`POST ${nodeBase}login`);
      const loginUrl = new URL('login', nodeBase.endsWith('/') ? nodeBase : nodeBase + '/');
      const res = await fetch(loginUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      addStage(`Login status: ${res.status}`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setError(`Login failed: ${text || res.status}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!data?.sessionId) {
        setError('Login failed: no sessionId');
        setLoading(false);
        return;
      }
      addStage('Received sessionId');
      // For now, just show success; you can navigate/use sessionId in subsequent screens
      setCookieToken(data.sessionId);
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


