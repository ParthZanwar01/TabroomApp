const express = require('express');
const cors = require('cors');
const axios = require('axios').default;
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*', credentials: true }));

// In-memory session cookie store: { sessionId: CookieJar }
const sessions = new Map();

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

function createClient(jar) {
  return wrapper(axios.create({
    withCredentials: true,
    jar,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 30000,
    validateStatus: () => true,
  }));
}

// POST /login { username, password } -> { sessionId }
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    // Create axios client with cookie jar
    const jar = new CookieJar();
    const client = createClient(jar);

    // Prime cookies by GET login page
    await client.get('https://www.tabroom.com/user/login/login.mhtml');

    // Post to save endpoint (Tabroom form action)
    const form = new URLSearchParams();
    form.set('username', username);
    form.set('email', username); // some forms use email
    form.set('password', password);
    form.set('remember', 'on');

    const resp = await client.post('https://www.tabroom.com/user/login/login_save.mhtml', form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': 'https://www.tabroom.com', 'Referer': 'https://www.tabroom.com/user/login/login.mhtml' },
    });

    // Check if cookie exists by visiting a protected page
    const me = await client.get('https://www.tabroom.com/user/home.mhtml');
    const cookies = await jar.getCookies('https://www.tabroom.com');
    const sessionCookie = cookies.find(c => /tabroom|session/i.test(c.key));
    if (!sessionCookie) return res.status(401).json({ error: 'Login failed' });

    const sessionId = uuidv4();
    sessions.set(sessionId, jar);
    return res.json({ sessionId });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /me?sessionId=… -> { html }
app.get('/me', async (req, res) => {
  try {
    const { sessionId } = req.query || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const jar = sessions.get(sessionId);
    if (!jar) return res.status(401).json({ error: 'No active session' });

    const client = createClient(jar);
    const resp = await client.get('https://www.tabroom.com/user/home.mhtml', { headers: { 'Accept': 'text/html' } });
    if (resp.status >= 400) return res.status(resp.status).json({ error: `Tabroom error ${resp.status}` });
    return res.json({ html: resp.data });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /tournament/:id?sessionId=...
// If sessionId exists and is valid, uses the stored cookie for full data; otherwise returns public data.
app.get('/tournament/:id', async (req, res) => {
  try {
    const tournId = String(req.params.id || '').trim();
    if (!tournId) return res.status(400).json({ error: 'tourn_id required' });

    const sessionId = (req.query.sessionId || req.headers['x-session-id'] || '').toString();
    const jar = sessions.get(sessionId);
    const client = createClient(jar);

    const url = `https://www.tabroom.com/api/download_data.mhtml?tourn_id=${encodeURIComponent(tournId)}`;
    const resp = await client.get(url, { headers: { 'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8' } });

    // Try to return JSON if possible
    const ct = (resp.headers['content-type'] || '').toLowerCase();
    if (ct.includes('application/json')) {
      return res.json(resp.data);
    }
    // If not JSON, try to parse; otherwise return raw
    if (typeof resp.data === 'string') {
      try {
        const json = JSON.parse(resp.data);
        return res.json(json);
      } catch (_) {
        return res.json({ raw: resp.data });
      }
    }
    return res.json(resp.data);
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});


