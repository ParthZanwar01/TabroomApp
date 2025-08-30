import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fetchMyProfile, getStoredSession, login, logout } from '@/lib/api/tabroom';

export default function AccountScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<any | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
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
      {profile ? (
        <View style={styles.card}>
          <ThemedText type="subtitle">{profile?.first} {profile?.last}</ThemedText>
          <ThemedText>{profile?.email}</ThemedText>
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
          {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
          {error ? <ThemedText>{error}</ThemedText> : null}
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


