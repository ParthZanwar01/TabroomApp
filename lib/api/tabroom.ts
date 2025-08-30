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

function getApiBasicHeader(): Record<string, string> | undefined {
  // Prefer pre-encoded BASIC string: base64("key:secret")
  const preEncoded = process.env.EXPO_PUBLIC_TABROOM_API_BASIC || (Constants.expoConfig?.extra as { tabroomApiBasic?: string } | undefined)?.tabroomApiBasic;
  if (preEncoded && typeof preEncoded === 'string') {
    return { Authorization: `Basic ${preEncoded}` };
  }
  return undefined;
}

async function apiGet<T>(path: string): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('Tabroom API base URL is not configured. Set EXPO_PUBLIC_TABROOM_API_BASE_URL or expo.extra.tabroomApiBaseUrl.');
  }

  const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const headers = getApiBasicHeader();
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
  const url = new URL('login', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getApiBasicHeader(),
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


