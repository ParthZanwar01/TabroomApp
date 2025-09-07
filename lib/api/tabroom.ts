import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export type TournamentSummary = {
  id: string;
  name: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  webname?: string;
};

export type TournamentDetail = TournamentSummary & {
  websiteUrl?: string;
  infoHtml?: string;
  // Add other fields as needed
};

function getBaseUrl(): string | undefined {
  const envUrl = process.env.EXPO_PUBLIC_TABROOM_API_BASE_URL;
  // Fallback to expo "extra" if provided in app.json
  const extraUrl = (Constants.expoConfig?.extra as { tabroomApiBaseUrl?: string } | undefined)?.tabroomApiBaseUrl;
  return envUrl || extraUrl;
}

function getBackendBaseUrl(): string | undefined {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  const extraUrl = (Constants.expoConfig?.extra as { backendBaseUrl?: string } | undefined)?.backendBaseUrl;
  return envUrl || extraUrl;
}

function getNodePuppeteerBaseUrl(): string | undefined {
  const envUrl = process.env.EXPO_PUBLIC_NODE_PUP_BASE_URL;
  const extraUrl = (Constants.expoConfig?.extra as { nodePupBaseUrl?: string } | undefined)?.nodePupBaseUrl;
  return envUrl || extraUrl;
}

function getNodePupBaseUrl(): string | undefined {
  const envUrl = process.env.EXPO_PUBLIC_NODE_PUP_BASE_URL;
  const extraUrl = (Constants.expoConfig?.extra as { nodePupBaseUrl?: string } | undefined)?.nodePupBaseUrl;
  return envUrl || extraUrl;
}

async function getApiBasicHeader(): Promise<Record<string, string> | undefined> {
  // 1) Secure, runtime-provided key (preferred)
  const stored = await SecureStore.getItemAsync('tabroom_api_basic');
  if (stored) return { Authorization: `Basic ${stored}` };

  // 2) Env/app.json provided key
  const preEncoded = process.env.EXPO_PUBLIC_TABROOM_API_BASIC || (Constants.expoConfig?.extra as { tabroomApiBasic?: string } | undefined)?.tabroomApiBasic;
  if (preEncoded && typeof preEncoded === 'string') {
    return { Authorization: `Basic ${preEncoded}` };
  }

  return undefined;
}

export function isApiConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_TABROOM_API_BASIC || (Constants.expoConfig?.extra as { tabroomApiBasic?: string } | undefined)?.tabroomApiBasic);
}

export async function hasApiKeyConfigured(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync('tabroom_api_basic');
  if (stored) return true;
  return isApiConfigured();
}

async function apiGet<T>(path: string): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('Tabroom API base URL is not configured. Set EXPO_PUBLIC_TABROOM_API_BASE_URL or expo.extra.tabroomApiBaseUrl.');
  }

  const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const headers = await getApiBasicHeader();
  // Non-public endpoints require an API key
  const isPublic = path.startsWith('public/') || path === 'status';
  if (!headers && !isPublic) {
    throw new Error('API key required: set EXPO_PUBLIC_TABROOM_API_BASIC (base64 of key:secret) or expo.extra.tabroomApiBasic.');
  }
  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed ${response.status}: ${text}`);
  }
  return response.json() as Promise<T>;
}

function mapInviteToSummary(invite: any): TournamentSummary {
  const id = String(invite?.id ?? invite?.tourn_id ?? invite?.tournId ?? '');
  const name = String(invite?.name ?? invite?.tourn_name ?? invite?.title ?? 'Unknown');
  const city = invite?.city ? String(invite.city) : undefined;
  const state = invite?.state ? String(invite.state) : undefined;
  const location = [city, state].filter(Boolean).join(', ') || undefined;
  const startDate = invite?.start || invite?.startDate || invite?.start_date;
  const endDate = invite?.end || invite?.endDate || invite?.end_date;
  const webname = invite?.webname ? String(invite.webname) : undefined;
  return { id, name, location, startDate, endDate, webname };
}

export async function listUpcomingTournaments(circuit?: string): Promise<TournamentSummary[]> {
  const path = circuit ? `public/invite/upcoming/${encodeURIComponent(circuit)}` : 'public/invite/upcoming';
  const data = await apiGet<any>(path);
  const list: any[] = Array.isArray(data) ? data : (data?.tournaments ?? data?.result ?? []);
  return list.map(mapInviteToSummary);
}

export async function searchTournaments(searchString: string, time: 'past' | 'future' | 'both' = 'both'): Promise<TournamentSummary[]> {
  const safe = encodeURIComponent(searchString);
  const path = `public/search/${encodeURIComponent(time)}/${safe}`;
  const data = await apiGet<any>(path);
  const list: any[] = Array.isArray(data) ? data : (data?.tournaments ?? data?.result ?? []);
  return list.map(mapInviteToSummary);
}

export async function fetchTournamentById(tournamentId: string): Promise<TournamentDetail> {
  const data = await apiGet<any>(`public/invite/tourn/${encodeURIComponent(tournamentId)}`);
  const summary = mapInviteToSummary(data);
  const websiteUrl: string | undefined = data?.website || data?.url || (summary.webname ? `https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=${summary.id}` : undefined);
  return { ...summary, websiteUrl, infoHtml: data?.invite_html ?? data?.infoHtml };
}

export async function getSystemStatus(): Promise<Record<string, any>> {
  return apiGet<Record<string, any>>('status');
}

export async function login(username: string, password: string): Promise<{ person_id: number; name: string }> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) throw new Error('Tabroom API base URL is not configured.');
  const basic = await getApiBasicHeader();
  if (!basic) throw new Error('API key required to call /login. Set EXPO_PUBLIC_TABROOM_API_BASIC or expo.extra.tabroomApiBasic.');
  const url = new URL('login', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...basic,
    },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Login failed ${response.status}: ${text}`);
  }
  const session = await response.json();
  await SecureStore.setItemAsync('tabroom_session', JSON.stringify(session));
  return session as { person_id: number; name: string };
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync('tabroom_session');
}

export async function getStoredSession(): Promise<{ person_id: number; name: string } | undefined> {
  const raw = await SecureStore.getItemAsync('tabroom_session');
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function fetchMyProfile(): Promise<any> {
  return apiGet<any>('user/profile');
}

export async function saveApiKeyBase64(basicBase64: string): Promise<void> {
  await SecureStore.setItemAsync('tabroom_api_basic', basicBase64.trim());
}

export async function saveApiKeyAndSecret(key: string, secret: string): Promise<void> {
  const token = typeof Buffer !== 'undefined' ? Buffer.from(`${key}:${secret}`).toString('base64') : btoa(`${key}:${secret}`);
  await saveApiKeyBase64(token);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync('tabroom_api_basic');
}

// Backend cookie-login bridge
export async function backendCookieLogin(email: string, password: string): Promise<{ token: string }> {
  const nodeUrl = getNodePuppeteerBaseUrl();
  if (nodeUrl) {
    const url = new URL('api/pup-login', nodeUrl.endsWith('/') ? nodeUrl : nodeUrl + '/');
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password, headless: true }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.cookie && data.cookie_name) {
        return { token: `${data.cookie_name}:${data.cookie}` };
      }
    }
  }
  throw new Error('Cookie login failed. Node Puppeteer backend unreachable or credentials invalid.');
}

export async function backendFetchBallots(token: string): Promise<string> {
  const nodeUrl = getNodePuppeteerBaseUrl();
  if (nodeUrl) {
    const [cookie_name, cookie] = token.split(':');
    const url = new URL('api/ballots', nodeUrl.endsWith('/') ? nodeUrl : nodeUrl + '/');
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie, cookie_name }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.html) return data.html as string;
    }
  }
  throw new Error('Fetch ballots failed. Node backend unreachable or token invalid.');
}

export async function backendDiagnostics(): Promise<{ python?: boolean; node?: boolean }> {
  const out: { python?: boolean; node?: boolean } = {};
  const python = getBackendBaseUrl();
  const node = getNodePuppeteerBaseUrl();
  try {
    if (python) {
      const url = new URL('health', python.endsWith('/') ? python : python + '/');
      const r = await fetch(url.toString());
      out.python = r.ok;
    }
  } catch {}
  try {
    if (node) {
      const url = new URL('api/health', node.endsWith('/') ? node : node + '/');
      const r = await fetch(url.toString());
      out.node = r.ok;
    }
  } catch {}
  return out;
}

// Backend session-based login and ballots
export async function backendSessionLogin(email: string, password: string): Promise<{ sessionId: string }> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) throw new Error('Backend base URL not configured');
  const url = new URL('session-login', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Session login failed ${res.status}: ${text}`);
  }
  return res.json();
}

export async function backendSessionLogout(sessionId: string): Promise<void> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) throw new Error('Backend base URL not configured');
  const url = new URL('session-logout', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Session logout failed ${res.status}: ${text}`);
  }
}

export async function backendFetchBallotsBySession(sessionId: string): Promise<string> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) throw new Error('Backend base URL not configured');
  const url = new URL('ballots', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Fetch ballots failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.html as string;
}

export async function backendBrowserLogin(email: string, password: string, headless: boolean = true): Promise<{ token: string; cookie_name?: string }> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) throw new Error('Backend base URL not configured');
  const url = new URL('browser-login', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, headless }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Browser login failed ${res.status}: ${text}`);
  }
  return res.json();
}

export async function nodePuppeteerLogin(username: string, password: string): Promise<{ success: boolean; cookie?: string; cookie_name?: string; error?: string }> {
  const baseUrl = getNodePupBaseUrl();
  if (!baseUrl) throw new Error('Node puppeteer base URL not configured');
  const url = new URL('api/pup-login', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Puppeteer login failed ${res.status}: ${text}`);
  }
  return res.json();
}


