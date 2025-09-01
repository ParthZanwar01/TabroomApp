import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { backendFetchBallots, nodePuppeteerLogin } from '@/lib/api/tabroom';
import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

export default function TerminalLoginScreen() {
  const [output, setOutput] = useState('Welcome to Tabroom AI Terminal\nType: login <username> <password>\n');
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState('');
  const scrollRef = useRef<View>(null);

  function append(line: string) {
    setOutput(prev => prev + (prev.endsWith('\n') ? '' : '\n') + line);
    setTimeout(() => scrollRef.current?.scrollTo?.({ y: 99999, animated: true }), 0);
  }

  async function handleCommand(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    append(`> ${trimmed}`);
    const parts = trimmed.split(/\s+/);
    if (parts[0] !== 'login' || parts.length !== 3) {
      append('Usage: login <username> <password>');
      return;
    }
    const username = parts[1];
    const password = parts[2];
    setLoading(true);
    append('Logging in via Puppeteer (full browser)...');
    try {
      const data = await nodePuppeteerLogin(username, password);
      if (!data.success || !data.cookie) {
        throw new Error(data.error || 'No cookie');
      }
      append(`Login successful! Session cookie: ${data.cookie.slice(0, 16)}…`);
      const html = await backendFetchBallots(data.cookie);
      append(`Ballots HTML preview: ${html.slice(0, 120)}…`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      append(`Login failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.terminal} ref={scrollRef as any}>
        <ThemedText style={styles.output}>{output}</ThemedText>
        <View style={styles.promptRow}>
          <ThemedText style={styles.prompt}>{'>'}</ThemedText>
          <TextInput
            style={styles.promptInput}
            value={command}
            onChangeText={setCommand}
            onSubmitEditing={() => { const cmd = command; setCommand(''); handleCommand(cmd); }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            placeholder="login user@example.com mypassword"
            placeholderTextColor="#0a0"
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  terminal: { padding: 20, backgroundColor: '#111', borderRadius: 12, height: 400 },
  output: { fontFamily: 'Courier', color: '#0f0' },
  promptRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  prompt: { fontFamily: 'Courier', color: '#0f0', marginRight: 8 },
  promptInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, color: '#0f0' },
});
