const express = require('express');
const cors = require('cors');
const axios = require('axios').default;
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const { v4: uuidv4 } = require('uuid');
const cheerio = require('cheerio');

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

    // 1) Load the login page to get initial cookies and hidden fields
    const loginPageUrl = 'https://www.tabroom.com/user/login/login.mhtml';
    const loginPageResp = await client.get(loginPageUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.tabroom.com/',
      },
    });
    if (loginPageResp.status >= 400) {
      return res.status(502).json({ error: `Failed to load login page: ${loginPageResp.status}` });
    }

    // 2) Parse the form to capture action and hidden inputs
    const $ = cheerio.load(loginPageResp.data || '');
    const formEl = $('form').filter((_, el) => {
      const action = $(el).attr('action') || '';
      return /login_save/i.test(action) || /login/i.test(action);
    }).first();

    const actionAttr = formEl.attr('action') || '/user/login/login_save.mhtml';
    const actionUrl = new URL(actionAttr, 'https://www.tabroom.com').toString();

    const form = new URLSearchParams();
    formEl.find('input').each((_, input) => {
      const name = $(input).attr('name');
      if (!name) return;
      const type = ($(input).attr('type') || '').toLowerCase();
      const value = $(input).attr('value') || '';
      // Preserve server-provided defaults for hidden and other inputs
      if (type === 'hidden') {
        form.set(name, value);
        return;
      }
      // We'll override user/password fields below
      form.set(name, value);
    });

    // 3) Ensure we set the credential fields expected by Tabroom
    // Try to be flexible: if form has fields that look like user/email, set them.
    let setUser = false;
    let setPass = false;
    for (const key of Array.from(form.keys())) {
      if (/pass/i.test(key)) {
        form.set(key, password);
        setPass = true;
      }
      if (/email|user|login/i.test(key)) {
        form.set(key, username);
        setUser = true;
      }
    }
    if (!setUser) {
      form.set('email', username);
      form.set('username', username);
    }
    if (!setPass) {
      form.set('password', password);
    }
    // Common remember-me field
    if (!form.has('remember')) {
      form.set('remember', 'on');
    }

    // 4) Submit the login form to the parsed action URL
    const postResp = await client.post(actionUrl, form.toString(), {
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://www.tabroom.com',
        'Referer': loginPageUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      validateStatus: () => true,
    });

    // Check if cookie exists by visiting a protected page
    const me = await client.get('https://www.tabroom.com/user/home.mhtml');
    const cookies = await jar.getCookies('https://www.tabroom.com');
    const sessionCookie = cookies.find(c => /tabroomtoken|tabroom|session|phpsessid/i.test(c.key));
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

// GET /ballots?sessionId=… -> { html }
app.get('/ballots', async (req, res) => {
  try {
    const sessionId = (req.query.sessionId || req.headers['x-session-id'] || '').toString();
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const jar = sessions.get(sessionId);
    if (!jar) return res.status(401).json({ error: 'No active session' });

    const client = createClient(jar);
    const url = 'https://www.tabroom.com/user/ballots.mhtml';
    const resp = await client.get(url, { headers: { 'Accept': 'text/html' } });
    if (resp.status >= 400) return res.status(resp.status).json({ error: `Tabroom error ${resp.status}` });

    // Heuristic: if redirected to login page content, treat as 401
    if (typeof resp.data === 'string' && /<form[^>]*action=["'][^"']*login/i.test(resp.data)) {
      return res.status(401).json({ error: 'Session expired' });
    }

    return res.json({ html: resp.data });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /ballots/parsed?sessionId=… -> { results: [ { tournName, tournUrl, dateIso, dateEpochMs, code, division, resultUrl } ] }
app.get('/ballots/parsed', async (req, res) => {
  try {
    const sessionId = (req.query.sessionId || req.headers['x-session-id'] || '').toString();
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const jar = sessions.get(sessionId);
    if (!jar) return res.status(401).json({ error: 'No active session' });

    const client = createClient(jar);
    const url = 'https://www.tabroom.com/user/ballots.mhtml';
    const resp = await client.get(url, { headers: { 'Accept': 'text/html' } });
    if (resp.status >= 400) return res.status(resp.status).json({ error: `Tabroom error ${resp.status}` });

    const html = String(resp.data || '');
    const $ = cheerio.load(html);

    function abs(href) {
      try { return new URL(href, 'https://www.tabroom.com').toString(); } catch { return href; }
    }

    // Find the results table by header labels
    let resultsTable;
    $('table').each((_, table) => {
      const headers = $(table).find('thead th').map((i, th) => $(th).text().trim().toLowerCase()).get();
      if (headers.includes('tourn') && headers.includes('date')) {
        resultsTable = table;
        return false;
      }
      return true;
    });

    const results = [];
    if (resultsTable) {
      $(resultsTable).find('tbody > tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 5) return;
        const tournAnchor = $(tds[0]).find('a').first();
        const tournName = tournAnchor.text().trim() || $(tds[0]).text().trim();
        const tournUrl = abs(tournAnchor.attr('href'));

        const dateCell = $(tds[1]);
        const rawAttr = dateCell.attr('data-text') || '';
        const rawText = dateCell.text().trim();
        const rawDate = rawAttr || rawText;
        const iso = rawDate ? rawDate.replace(' ', 'T').replace(/(?::\d\d)$/, '$&:00') : undefined;
        let dateEpochMs = Number.NaN;
        try { dateEpochMs = Date.parse(iso || rawText); } catch {}

        const code = $(tds[2]).text().trim();
        const division = $(tds[3]).text().trim();
        const resultAnchor = $(tds[4]).find('a').first();
        const resultUrl = abs(resultAnchor.attr('href'));

        results.push({
          tournName,
          tournUrl,
          dateIso: iso || rawText,
          dateEpochMs: Number.isFinite(dateEpochMs) ? dateEpochMs : undefined,
          code,
          division,
          resultUrl,
        });
      });

      results.sort((a, b) => (b.dateEpochMs || 0) - (a.dateEpochMs || 0));
    }

    return res.json({ results });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /ballots/latest?sessionId=… -> { html, url }
app.get('/ballots/latest', async (req, res) => {
  try {
    const sessionId = (req.query.sessionId || req.headers['x-session-id'] || '').toString();
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const jar = sessions.get(sessionId);
    if (!jar) return res.status(401).json({ error: 'No active session' });

    const client = createClient(jar);
    // Load ballots page and parse the most recent result link
    const ballotsResp = await client.get('https://www.tabroom.com/user/ballots.mhtml', { headers: { 'Accept': 'text/html' } });
    if (ballotsResp.status >= 400) return res.status(ballotsResp.status).json({ error: `Tabroom error ${ballotsResp.status}` });
    const $ = cheerio.load(String(ballotsResp.data || ''));

    function abs(href) {
      try { return new URL(href, 'https://www.tabroom.com').toString(); } catch { return href; }
    }

    // Identify results table and sort rows by date like in /ballots/parsed
    let resultsTable;
    $('table').each((_, table) => {
      const headers = $(table).find('thead th').map((i, th) => $(th).text().trim().toLowerCase()).get();
      if (headers.includes('tourn') && headers.includes('date')) {
        resultsTable = table; return false;
      }
      return true;
    });

    if (!resultsTable) return res.status(404).json({ error: 'No results table found' });

    const rows = $(resultsTable).find('tbody > tr').get().map(tr => {
      const tds = $(tr).find('td');
      const dateCell = $(tds[1]);
      const rawAttr = dateCell.attr('data-text') || '';
      const rawText = dateCell.text().trim();
      const rawDate = rawAttr || rawText;
      const iso = rawDate ? rawDate.replace(' ', 'T').replace(/(?::\d\d)$/, '$&:00') : undefined;
      let dateEpochMs = Number.NaN; try { dateEpochMs = Date.parse(iso || rawText); } catch {}
      const resultAnchor = $(tds[4]).find('a').first();
      const resultUrl = abs(resultAnchor.attr('href'));
      return { dateEpochMs: Number.isFinite(dateEpochMs) ? dateEpochMs : 0, resultUrl };
    }).filter(r => r.resultUrl);

    if (!rows.length) return res.status(404).json({ error: 'No results links found' });
    rows.sort((a, b) => b.dateEpochMs - a.dateEpochMs);
    const latestUrl = rows[0].resultUrl;

    // Fetch the latest result page HTML
    const latestResp = await client.get(latestUrl, { headers: { 'Accept': 'text/html' } });
    if (latestResp.status >= 400) return res.status(latestResp.status).json({ error: `Tabroom error ${latestResp.status}` });
    return res.json({ html: latestResp.data, url: latestUrl });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /active-tournaments?sessionId=… -> { items: [ { id, name, url, dateIso, dateEpochMs, event, status } ] }
app.get('/active-tournaments', async (req, res) => {
  try {
    const sessionId = (req.query.sessionId || req.headers['x-session-id'] || '').toString();
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const jar = sessions.get(sessionId);
    if (!jar) return res.status(401).json({ error: 'No active session' });

    const client = createClient(jar);
    // Discover person_id from home or ballots page
    const discoverUrls = [
      'https://www.tabroom.com/user/home.mhtml',
      'https://www.tabroom.com/user/ballots.mhtml',
    ];
    let personId;
    for (const u of discoverUrls) {
      const r = await client.get(u, { headers: { 'Accept': 'text/html' } });
      const html = String(r.data || '');
      const m = html.match(/person_id=(\d{3,})/);
      if (m) { personId = m[1]; break; }
    }
    if (!personId) return res.status(404).json({ error: 'Could not determine person_id' });

    // Load student index to get Future Tournaments table
    const studentUrl = `https://www.tabroom.com/user/student/index.mhtml?person_id=${encodeURIComponent(personId)}`;
    const resp = await client.get(studentUrl, { headers: { 'Accept': 'text/html' } });
    if (resp.status >= 400) return res.status(resp.status).json({ error: `Tabroom error ${resp.status}` });
    const $ = cheerio.load(String(resp.data || ''));

    function abs(href) { try { return new URL(href, 'https://www.tabroom.com').toString(); } catch { return href; } }
    function getTournIdFromUrl(href) { const m = (href || '').match(/tourn_id=(\d+)/); return m ? m[1] : undefined; }

    // Find the Future Tournaments table (#upcoming in observed markup)
    const table = $('#upcoming').length ? $('#upcoming') : $('table').filter((_, t) => $(t).find('thead th').map((i, th) => $(th).text().trim().toLowerCase()).get().includes('tournament')).first();
    const items = [];
    if (table && table.length) {
      table.find('tbody > tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 5) return;
        const nameA = $(tds[0]).find('a').first();
        const name = nameA.text().trim() || $(tds[0]).text().trim();
        const url = abs(nameA.attr('href'));
        const id = getTournIdFromUrl(url);
        const dateCell = $(tds[1]);
        const rawAttr = dateCell.attr('data-text') || '';
        const rawText = dateCell.text().trim();
        const rawDate = rawAttr || rawText;
        const iso = rawDate ? rawDate.replace(' ', 'T') : undefined;
        let dateEpochMs = Number.NaN; try { dateEpochMs = Date.parse(iso || rawText); } catch {}
        const event = $(tds[2]).text().trim();
        const status = $(tds[4]).text().trim();
        if (name) items.push({ id, name, url, dateIso: iso || rawText, dateEpochMs: Number.isFinite(dateEpochMs) ? dateEpochMs : undefined, event, status });
      });
      items.sort((a, b) => (a.dateEpochMs || 0) - (b.dateEpochMs || 0));
    }

    return res.json({ items, personId });
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


