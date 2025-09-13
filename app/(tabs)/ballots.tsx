import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fetchBallotsHtmlSession, fetchLatestBallotHtml } from '@/lib/api/tabroom';
import { useRouter } from 'expo-router';

export default function BallotsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [html, setHtml] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        // Prefer the latest result page when possible
        const latest = await fetchLatestBallotHtml().catch(() => undefined);
        if (latest && isMounted) { setHtml(latest); return; }
        const ballotsHtml = await fetchBallotsHtmlSession();
        if (isMounted) setHtml(ballotsHtml);
      } catch (e) {
        if (isMounted) setError(e instanceof Error ? e.message : 'Failed to load ballots');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 8 }}>Loading ballots…</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{error}</ThemedText>
        <View style={{ height: 12 }} />
        <ThemedText onPress={() => router.push('/(tabs)/account')}>
          Tap here to re-login and refresh your session.
        </ThemedText>
      </ThemedView>
    );
  }

  if (!html) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>No ballots available.</ThemedText>
      </ThemedView>
    );
  }

  const htmlWithBase = html.includes('<base ')
    ? html
    : html.replace(/<head(\b[^>]*)?>/i, '<head$1><base href="https://www.tabroom.com/">');

  return (
    <View style={{ flex: 1 }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlWithBase }}
        javaScriptEnabled
        injectedJavaScript={`(function(){try{var el=document.querySelector('[id*="recent"], .panel, h2, h3'); if(el && el.scrollIntoView){el.scrollIntoView({block:"start"});}}catch(e){}; true;})()`}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}> 
            <ActivityIndicator />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});


