const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*', credentials: false }));

app.post('/api/pup-login', async (req, res) => {
  const { username, password, headless = true } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'username and password required' });
  }
  let browser;
  try {
    // 1) Launch browser (headless configurable)
    browser = await puppeteer.launch({ headless: !!headless, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let loggedIn = false;
    // Try homepage popup flow first
    try {
      await page.goto('https://www.tabroom.com/', { waitUntil: 'networkidle2', timeout: 45000 });
      const loginLink = await page.$('a.login-window');
      if (loginLink) {
        await loginLink.click();
      }
      const usernameSelector = (await page.$('input[name="username"]')) ? 'input[name="username"]' : 'input[name="email"]';
      await page.type(usernameSelector, username, { delay: 50 });
      await page.type('#password, input[name="password"]', password, { delay: 50 });
      await page.focus('#password, input[name="password"]');
      await page.keyboard.press('Enter');
      await page.waitForNetworkIdle({ idleTime: 800, timeout: 10000 }).catch(() => {});
      const hasUser = await page.$('.user-profile, a[href*="logout"], a[href*="/user/index.mhtml"]');
      if (hasUser) loggedIn = true;
    } catch (_) {}

    if (!loggedIn) {
      // Fallback to direct login page
      await page.goto('https://www.tabroom.com/user/login/login.mhtml', { waitUntil: 'networkidle2', timeout: 45000 });
      const hasIdUsername = await page.$('#username');
      if (hasIdUsername) {
        await page.type('#username', username, { delay: 50 });
      } else {
        await page.type('input[name="username"], input[name="email"]', username, { delay: 50 });
      }
      await page.type('#password, input[name="password"]', password, { delay: 50 });
      await page.waitForSelector('form.signin input[type=submit]', { visible: true, timeout: 10000 }).catch(() => {});
      await page.focus('#password, input[name="password"]');
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
    }

    // Touch an authenticated page to ensure cookie is set
    await page.goto('https://www.tabroom.com/user/ballots.mhtml', { waitUntil: 'load', timeout: 15000 }).catch(() => {});

    const cookies = await page.cookies();
    await browser.close();

    const sessionCookie = cookies.find(c => (c.name || '').toLowerCase().includes('tabroom')) || cookies.find(c => c.name === 'session');
    if (sessionCookie && sessionCookie.value) {
      return res.json({ success: true, cookie: sessionCookie.value, cookie_name: sessionCookie.name });
    }
    return res.json({ success: false, error: 'Login failed or cookie not set. Verify credentials or try headless:false.' });
  } catch (err) {
    if (browser) { try { await browser.close(); } catch (_) {} }
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Alias endpoint to match client examples
app.post('/api/login', async (req, res) => {
  // Delegate to the same handler as /api/pup-login
  req.url = '/api/pup-login';
  return app._router.handle(req, res, () => {});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Puppeteer server running on port ${PORT}`);
});


