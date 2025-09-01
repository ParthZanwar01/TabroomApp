import requests
from requests.utils import dict_from_cookiejar
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from typing import Optional, Tuple

LOGIN_URL = "https://www.tabroom.com/user/login.mhtml"
LOGIN_SAVE_URL = "https://www.tabroom.com/user/login/login_save.mhtml"
BALLOT_URL = "https://www.tabroom.com/user/ballots.mhtml"

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.tabroom.com/",
}


def _extract_login_form(session: requests.Session):
    get_resp = session.get(LOGIN_URL, allow_redirects=True, timeout=20)
    form_fields = {}
    action_url = LOGIN_SAVE_URL
    credential_field = None
    try:
        soup = BeautifulSoup(get_resp.text, 'html.parser')
        form = soup.find('form')
        if form:
            action_attr = form.get('action')
            if action_attr:
                action_url = urljoin(LOGIN_URL, action_attr)
            for inp in form.find_all('input'):
                name = inp.get('name')
                if not name:
                    continue
                value = inp.get('value') if inp.get('value') is not None else ''
                form_fields[name] = value
                if name in ['email', 'username']:
                    credential_field = name
    except Exception:
        pass
    # Default guesses
    if not credential_field:
        credential_field = 'email'
    return action_url, form_fields, credential_field


def login_tabroom(email: str, password: str) -> str:
    """
    Logs into Tabroom and returns the TabroomToken cookie.
    """
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)
    # Prime cookies/session and capture hidden form fields + action URL
    action_url, form_fields, credential_field = _extract_login_form(session)

    # Prepare login payload using discovered field names
    payload = {k: v for k, v in form_fields.items()}
    payload[credential_field] = email
    payload["password"] = password
    payload.setdefault("remember", "on")
    payload.setdefault("submit", form_fields.get('submit', 'Login'))

    # Execute login against the discovered action URL, defaulting to known save URL
    response = session.post(
        action_url or LOGIN_SAVE_URL,
        data=payload,
        allow_redirects=True,
        timeout=20,
        headers={
            **DEFAULT_HEADERS,
            "Origin": "https://www.tabroom.com",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    cookies = dict_from_cookiejar(session.cookies)
    token = cookies.get("TabroomToken") or response.cookies.get("TabroomToken")
    if token:
        return token

    # As a fallback, try accessing an authenticated page to force cookie set
    session.get(BALLOT_URL, allow_redirects=True, timeout=20, headers=DEFAULT_HEADERS)
    cookies = dict_from_cookiejar(session.cookies)
    token = cookies.get("TabroomToken")
    if token:
        return token

    raise Exception("Login failed — check credentials or try again.")


def login_tabroom_debug(email: str, password: str):
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)
    get_resp = session.get(LOGIN_URL, allow_redirects=True, timeout=20)
    soup = BeautifulSoup(get_resp.text, 'html.parser')
    inputs = []
    for inp in soup.find_all('input'):
        inputs.append({
            'name': inp.get('name'),
            'type': inp.get('type'),
            'value': inp.get('value'),
        })
    payload = {
        'email': '***',
        'password': '***',
    }
    post_resp = session.post(LOGIN_URL, data=payload, allow_redirects=True, timeout=20, headers={**DEFAULT_HEADERS, "Origin": "https://www.tabroom.com"})
    return {
        'get_status': get_resp.status_code,
        'post_status': post_resp.status_code,
        'final_url': post_resp.url,
        'cookies': dict_from_cookiejar(session.cookies),
        'inputs': inputs[:20],
    }


def fetch_ballots(token: str) -> str:
    """
    Fetches ballot page HTML for the authenticated user.
    """
    headers = {**DEFAULT_HEADERS, "Cookie": f"TabroomToken={token}"}
    response = requests.get(BALLOT_URL, headers=headers, allow_redirects=True, timeout=20)

    if response.status_code == 200:
        return response.text
    else:
        raise Exception(f"Failed to fetch ballots: {response.status_code}")


def fetch_authenticated_json(token: str, url: str, cookie_name: str = "TabroomToken"):
    """
    Fetches JSON from a Tabroom endpoint using the provided TabroomToken cookie.
    """
    headers = {
        **DEFAULT_HEADERS,
        "Accept": "application/json, text/plain, */*",
        "Cookie": f"{cookie_name}={token}",
    }
    resp = requests.get(url, headers=headers, allow_redirects=True, timeout=20)
    if resp.status_code == 200:
        return resp.json()
    raise Exception(f"Failed to fetch json: {resp.status_code}")


def browser_login_get_token(email: str, password: str, headless: bool = True) -> str:
    """
    Uses Playwright to perform a real browser login and return TabroomToken.
    """
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        raise Exception("Playwright is not installed on the server. Install with 'pip install playwright' and 'playwright install chromium'.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context()
        page = context.new_page()
        page.goto(LOGIN_URL, wait_until="load")
        # Try common field names
        if page.locator('input[name="username"]').count() > 0:
            page.fill('input[name="username"]', email)
        else:
            page.fill('input[name="email"]', email)
        page.fill('input[name="password"]', password)
        # Submit form
        submit = page.locator('input[type="submit"]')
        if submit.count() > 0:
            submit.first.click()
        else:
            page.keyboard.press('Enter')
        page.wait_for_load_state("networkidle")
        # Extract cookies
        cookies = context.cookies()
        browser.close()
        token: Optional[str] = None
        for c in cookies:
            if c.get('name') == 'TabroomToken' and c.get('value'):
                token = c['value']
                break
        if not token:
            raise Exception('Login via browser did not return TabroomToken')
        return token


def browser_login_via_home_popup(email: str, password: str, headless: bool = True) -> Tuple[str, str]:
    """
    Uses Playwright to perform login via the homepage login popup and returns (cookie_value, cookie_name).
    Prioritizes TabroomToken; falls back to 'session' if present.
    """
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        raise Exception("Playwright is not installed on the server. Install with 'pip install playwright' and 'playwright install chromium'.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context()
        page = context.new_page()
        page.goto("https://www.tabroom.com/", wait_until="load")
        # Open login popup
        try:
            page.click('a.login-window', timeout=5000)
        except Exception:
            pass
        # Fill credentials using homepage field names
        if page.locator('input[name="username"]').count() > 0:
            page.fill('input[name="username"]', email)
        else:
            page.fill('input[name="email"]', email)
        page.fill('input[name="password"]', password)
        # Submit
        if page.locator('input[type="submit"]').count() > 0:
            page.click('input[type="submit"]')
        else:
            page.keyboard.press('Enter')
        page.wait_for_load_state("networkidle")
        cookies = context.cookies()
        browser.close()
        token: Optional[str] = None
        cookie_name: str = "TabroomToken"
        # Prefer TabroomToken, then 'session'
        for c in cookies:
            if c.get('name') == 'TabroomToken' and c.get('value'):
                token = c['value']
                cookie_name = 'TabroomToken'
                break
        if not token:
            for c in cookies:
                if c.get('name') == 'session' and c.get('value'):
                    token = c['value']
                    cookie_name = 'session'
                    break
        if not token:
            raise Exception('Login via browser popup did not return a valid session cookie')
        return token, cookie_name


