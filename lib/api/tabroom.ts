import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Backend API base URL
const API_BASE_URL = 'http://192.168.68.59:8000';

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
  events?: Array<{
    name: string;
    division?: string;
    type?: string;
  }>;
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
  try {
    // 1) Secure, runtime-provided key (preferred)
    const stored = await SecureStore.getItemAsync('tabroom_api_basic');
    if (stored) return { Authorization: `Basic ${stored}` };
  } catch (e) {
    // SecureStore not available, continue to fallback
  }

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
  try {
    const stored = await SecureStore.getItemAsync('tabroom_api_basic');
    if (stored) return true;
  } catch (e) {
    // SecureStore not available, continue to fallback
  }
  return isApiConfigured();
}

// Backend session helpers
export async function storeBackendSessionId(sessionId: string): Promise<void> {
  console.log('storeBackendSessionId called with:', sessionId);
  
  // Check if we're in a web environment and localStorage is available
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('backend_session_id', sessionId);
      console.log('SessionId stored in localStorage successfully');
      return;
    } catch (e) {
      console.log('localStorage failed:', e);
    }
  }

  try {
    await SecureStore.setItemAsync('backend_session_id', sessionId);
    console.log('SessionId stored in SecureStore successfully');
  } catch (e) {
    console.log('SecureStore failed, using AsyncStorage:', e);
    // Fallback to AsyncStorage if SecureStore not available
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.default.setItem('backend_session_id', sessionId);
    console.log('SessionId stored in AsyncStorage successfully');
  }
}

export async function getBackendSessionId(): Promise<string | undefined> {
  console.log('getBackendSessionId called');
  
  // Check if we're in a web environment and localStorage is available
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const val = localStorage.getItem('backend_session_id');
      console.log('localStorage sessionId:', val);
      return val || undefined;
    } catch (e) {
      console.log('localStorage get failed:', e);
      return undefined;
    }
  }

  try {
    const val = await SecureStore.getItemAsync('backend_session_id');
    console.log('SecureStore sessionId:', val);
    return val || undefined;
  } catch (e) {
    console.log('SecureStore get failed:', e);
    // Fallback to AsyncStorage if SecureStore not available
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const val = await AsyncStorage.default.getItem('backend_session_id');
      console.log('AsyncStorage sessionId:', val);
      return val || undefined;
    } catch (e2) {
      console.log('AsyncStorage get failed:', e2);
      return undefined;
    }
  }
}

export async function setBackendSessionId(sessionId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync('backend_session_id', sessionId);
  } catch (e) {
    // Fallback to AsyncStorage if SecureStore not available
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('backend_session_id', sessionId);
    } catch (e2) {
      console.error('Failed to store backend session ID:', e2);
    }
  }
}

export async function clearBackendSessionId(): Promise<void> {
  // Check if we're in a web environment and localStorage is available
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('backend_session_id');
      console.log('SessionId cleared from localStorage');
      return;
    } catch (e) {
      console.log('localStorage clear failed:', e);
    }
  }

  try {
    await SecureStore.deleteItemAsync('backend_session_id');
    console.log('SessionId cleared from SecureStore');
  } catch (e) {
    // Fallback to AsyncStorage if SecureStore not available
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.removeItem('backend_session_id');
      console.log('SessionId cleared from AsyncStorage');
    } catch (e2) {
      // Ignore errors
    }
  }
}

export async function fetchDashboardData(): Promise<any> {
  const sessionId = await getBackendSessionId();
  console.log('fetchDashboardData - sessionId:', sessionId);
  if (!sessionId) {
    throw new Error('No active session');
  }

  const url = `${API_BASE_URL}/dashboard`;
  console.log('fetchDashboardData - calling:', url);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });

  console.log('fetchDashboardData - response status:', response.status);
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.log('fetchDashboardData - error response:', errorText);
    throw new Error(`Failed to fetch dashboard data: ${response.status}`);
  }

  return response.json();
}

export async function fetchUserTournaments(): Promise<any> {
  const sessionId = await getBackendSessionId();
  if (!sessionId) {
    throw new Error('No active session');
  }

  const url = `${API_BASE_URL}/active-tournaments?sessionId=${sessionId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tournaments: ${response.status}`);
  }

  return response.json();
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
  try {
    const response = await fetch(`${API_BASE_URL}/tournaments/upcoming`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw upcoming tournaments data:', data);

    const tournaments: TournamentSummary[] = data.tournaments || [];
    console.log('Transformed upcoming tournaments:', tournaments);
    return tournaments;
  } catch (error) {
    console.error('Error fetching upcoming tournaments:', error);
    throw error;
  }
}

export async function searchTournaments(searchString: string, time: 'past' | 'future' | 'both' = 'both'): Promise<TournamentSummary[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/tournaments/search?q=${encodeURIComponent(searchString)}&time=${encodeURIComponent(time)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw search tournaments data:', data);

    const tournaments: TournamentSummary[] = data.tournaments || [];
    console.log('Transformed search tournaments:', tournaments);
    return tournaments;
  } catch (error) {
    console.error('Error searching tournaments:', error);
    throw error;
  }
}

export async function fetchTournamentById(tournamentId: string): Promise<TournamentDetail> {
  const data = await apiGet<any>(`public/invite/tourn/${encodeURIComponent(tournamentId)}`);
  const summary = mapInviteToSummary(data);
  const websiteUrl: string | undefined = data?.website || data?.url || (summary.webname ? `https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=${summary.id}` : undefined);
  return { ...summary, websiteUrl, infoHtml: data?.invite_html ?? data?.infoHtml };
}

// Try backend first (with session) then fall back to public API
export async function fetchTournamentByIdSmart(tournamentId: string): Promise<TournamentDetail> {
  const sessionId = await getBackendSessionId();
  
  try {
    const url = `${API_BASE_URL}/tournament/${encodeURIComponent(tournamentId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const tournament = await response.json();
      console.log('Raw tournament details from backend:', tournament);
      
      // The backend already returns the data in the correct format
      return {
        id: tournament.id,
        name: tournament.name,
        location: tournament.location,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        webname: tournament.webname,
        websiteUrl: tournament.websiteUrl,
        events: tournament.events || [],
        infoHtml: tournament.infoHtml
      };
    }
  } catch (error) {
    console.error('Error fetching tournament details from backend:', error);
  }
  
  // Fallback to direct API call
  return fetchTournamentById(tournamentId);
}

export async function getSystemStatus(): Promise<Record<string, any>> {
  return apiGet<Record<string, any>>('status');
}

export async function login(username: string, password: string): Promise<{ person_id: number; name: string }> {
  // Use backend session login for proper session management
  const response = await fetch(`${API_BASE_URL}/session-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      username: username,
      password: password 
    }),
  });
  
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Login failed ${response.status}: ${text}`);
  }
  
  const sessionData = await response.json();
  const sessionId = sessionData.sessionId;
  
  // Store the backend session ID for future API calls
  await storeBackendSessionId(sessionId);
  
  // Get user info from dashboard to return person_id and name
  try {
    const dashboardData = await fetchDashboardData();
    return {
      person_id: dashboardData.user_id || 0,
      name: dashboardData.user_name || 'User'
    };
  } catch (error) {
    // If dashboard fails, return basic info
    return {
      person_id: 0,
      name: 'User'
    };
  }
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
  const urlWithQuery = new URL(url.toString());
  urlWithQuery.searchParams.set('sessionId', sessionId);
  const res = await fetch(urlWithQuery.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Fetch ballots failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.html as string;
}

export async function fetchBallotsHtmlSession(): Promise<string> {
  const sessionId = await getBackendSessionId();
  if (!sessionId) throw new Error('Not logged in');

  const configured = getBackendBaseUrl();
  const candidates = [
    configured,
    'http://192.168.68.59:8000/',
    'http://127.0.0.1:8000/',
    'http://localhost:8000/',
  ].filter(Boolean) as string[];

  for (const base of candidates) {
    try {
      const baseUrl = base.endsWith('/') ? base : base + '/';
      const url = new URL('ballots', baseUrl);
      url.searchParams.set('sessionId', sessionId);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data?.html) return data.html as string;
      }
    } catch {}
  }
  throw new Error('Ballots request failed. Backend unreachable or session expired.');
}

export async function fetchLatestBallotHtml(): Promise<string> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) throw new Error('Backend base URL not configured');
  const sessionId = await getBackendSessionId();
  if (!sessionId) throw new Error('Not logged in');
  const candidates = [
    baseUrl,
    'http://192.168.68.59:8000/',
    'http://127.0.0.1:8000/',
    'http://localhost:8000/',
  ].filter(Boolean) as string[];
  for (const base of candidates) {
    try {
      const b = base.endsWith('/') ? base : base + '/';
      const url = new URL('ballots/latest', b);
      url.searchParams.set('sessionId', sessionId);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data?.html) return data.html as string;
      }
    } catch {}
  }
  throw new Error('Latest ballot fetch failed');
}

export type ParsedBallot = {
  tournName: string;
  tournUrl?: string;
  dateIso?: string;
  dateEpochMs?: number;
  code?: string;
  division?: string;
  resultUrl?: string;
};

export async function fetchParsedBallots(): Promise<ParsedBallot[]> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) throw new Error('Backend base URL not configured');
  const sessionId = await getBackendSessionId();
  if (!sessionId) throw new Error('Not logged in');
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const url = new URL('ballots/parsed', base);
  url.searchParams.set('sessionId', sessionId);
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Fetch parsed ballots failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data?.results as ParsedBallot[]) || [];
}

export async function fetchMostRecentBallot(): Promise<ParsedBallot | undefined> {
  const items = await fetchParsedBallots();
  return items[0];
}

export type ActiveTournament = {
  id?: string;
  name: string;
  url?: string;
  dateIso?: string;
  dateEpochMs?: number;
  event?: string;
  status?: string;
};

export async function fetchActiveTournaments(): Promise<ActiveTournament[]> {
  const sessionId = await getBackendSessionId();
  if (!sessionId) throw new Error('Not logged in');
  
  const url = new URL(`${API_BASE_URL}/active-tournaments`);
  url.searchParams.set('sessionId', sessionId);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to fetch active tournaments ${response.status}: ${text}`);
  }
  
  const data = await response.json();
  return data.tournaments || [];
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


