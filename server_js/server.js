const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*', credentials: false }));

app.post('/api/pup-login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'username and password required' });
  }
  let browser;
  try {
    // 1) Launch a headless browser
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 2) Go to Tabroom login page
    await page.goto('https://www.tabroom.com/user/login/login.mhtml', { waitUntil: 'networkidle2', timeout: 45000 });

    // 3) Fill in the login form (type with delay for human-like input)
    const hasIdUsername = await page.$('#username');
    if (hasIdUsername) {
      await page.type('#username', username, { delay: 50 });
    } else {
      await page.type('input[name="username"], input[name="email"]', username, { delay: 50 });
    }
    await page.type('#password, input[name="password"]', password, { delay: 50 });

    // 4) Wait for the submit button to be visible
    await page.waitForSelector('form.signin input[type=submit]', { visible: true, timeout: 10000 }).catch(() => {});

    // 5) Submit by pressing Enter in the password field (avoids some click issues)
    await page.focus('#password');
    await page.keyboard.press('Enter');

    // 6) Wait for navigation after login (gracefully continue on timeout)
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});

    // 7) Get all cookies from the page
    const cookies = await page.cookies();
    await browser.close();

    // 8) Find a Tabroom-related session cookie (name may include "tabroom")
    const sessionCookie = cookies.find(c => (c.name || '').toLowerCase().includes('tabroom')) || cookies.find(c => c.name === 'session');
    if (sessionCookie && sessionCookie.value) {
      // 10) Return result
      return res.json({ success: true, cookie: sessionCookie.value, cookie_name: sessionCookie.name });
    }
    return res.json({ success: false, error: 'Failed to retrieve session cookie. Check your credentials.' });
  } catch (err) {
    if (browser) { try { await browser.close(); } catch (_) {} }
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Puppeteer server running on port ${PORT}`);
});


