import requests
from requests.utils import dict_from_cookiejar
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from typing import Optional, Tuple

LOGIN_URL = "https://www.tabroom.com/index/index.mhtml"
LOGIN_SAVE_URL = "https://www.tabroom.com/user/login/login_save.mhtml"
BALLOT_URL = "https://www.tabroom.com/user/ballots.mhtml"
DASHBOARD_URL = "https://www.tabroom.com/user/index.mhtml"
TOURNAMENTS_URL = "https://www.tabroom.com/user/tournaments.mhtml"

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
        # Look for the login form specifically
        login_form = soup.find('form', {'action': '/user/login/login_save.mhtml'})
        if not login_form:
            # Fallback to any form
            login_form = soup.find('form')
        
        if login_form:
            action_attr = login_form.get('action')
            if action_attr:
                action_url = urljoin(LOGIN_URL, action_attr)
            for inp in login_form.find_all('input'):
                name = inp.get('name')
                if not name:
                    continue
                value = inp.get('value') if inp.get('value') is not None else ''
                form_fields[name] = value
                if name in ['email', 'username']:
                    credential_field = name
    except Exception as e:
        print(f"Error extracting form: {e}")
        pass
    # Default to username since that's what Tabroom uses
    if not credential_field:
        credential_field = 'username'
    return action_url, form_fields, credential_field


def login_tabroom(email: str, password: str) -> str:
    """
    Logs into Tabroom and returns the TabroomToken cookie.
    """
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)
    
    # Prime cookies/session and capture hidden form fields + action URL
    action_url, form_fields, credential_field = _extract_login_form(session)
    
    print(f"Debug: action_url={action_url}, credential_field={credential_field}")
    print(f"Debug: form_fields keys={list(form_fields.keys())}")

    # Prepare login payload using discovered field names
    payload = {k: v for k, v in form_fields.items()}
    payload[credential_field] = email
    payload["password"] = password
    # Don't set remember or submit if they're not in the form
    if "remember" not in payload:
        payload["remember"] = "on"
    if "submit" not in payload:
        payload["submit"] = "Login"

    print(f"Debug: payload keys={list(payload.keys())}")

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

    print(f"Debug: response status={response.status_code}")
    print(f"Debug: response URL={response.url}")
    print(f"Debug: cookies after login={dict_from_cookiejar(session.cookies)}")

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


def extract_user_info_from_dashboard(session: requests.Session, email: str = None) -> dict:
    """Extract user information from the dashboard page"""
    try:
        response = session.get(DASHBOARD_URL, timeout=20)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract user info - try multiple selectors
        user_name = "User"
        try:
            # Try various selectors for username
            name_selectors = [
                'span.username', 'div.userinfo', '.user-name', '.username',
                'span[class*="user"]', 'div[class*="user"]',
                'h1', 'h2', '.welcome', '.greeting'
            ]
            
            for selector in name_selectors:
                name_element = soup.select_one(selector)
                if name_element:
                    text = name_element.get_text(strip=True)
                    # Look for patterns like "Welcome, John Doe" or "John Doe"
                    if text and len(text) > 1 and not text.lower().startswith('welcome'):
                        # Extract name from "Welcome, John Doe" or just use the text
                        if ',' in text:
                            user_name = text.split(',')[1].strip()
                        else:
                            user_name = text
                        break
                    elif text and len(text) > 1 and text.lower().startswith('welcome'):
                        # Extract name from "Welcome, John Doe"
                        if ',' in text:
                            user_name = text.split(',')[1].strip()
                        break
            
            # If we still don't have a good name, try to use email as fallback
            if user_name == "User" and email:
                # Extract name from email (before @)
                if '@' in email:
                    user_name = email.split('@')[0].replace('.', ' ').title()
                else:
                    user_name = email
                    
        except Exception as e:
            print(f"Error extracting username: {e}")
            # Use email as fallback
            if email and '@' in email:
                user_name = email.split('@')[0].replace('.', ' ').title()
            elif email:
                user_name = email
        
        return {'user_name': user_name}
    except Exception as e:
        print(f"Error extracting user info: {e}")
        # Use email as fallback
        if email and '@' in email:
            user_name = email.split('@')[0].replace('.', ' ').title()
        elif email:
            user_name = email
        else:
            user_name = 'User'
        return {'user_name': user_name}


def list_upcoming_tournaments():
    """Get upcoming tournaments from Tabroom API"""
    try:
        response = requests.get('https://api.tabroom.com/v1/public/invite/upcoming', 
                              headers=DEFAULT_HEADERS, timeout=20)
        response.raise_for_status()
        data = response.json()
        
        # Transform the data to match our frontend format
        tournaments = []
        if isinstance(data, list):
            for item in data:
                tournament = {
                    'id': str(item.get('id', '')),
                    'name': item.get('name', 'Unknown Tournament'),
                    'location': None,
                    'startDate': item.get('start'),
                    'endDate': item.get('end'),
                    'webname': item.get('webname')
                }
                
                # Build location string
                city = item.get('city')
                state = item.get('state')
                if city or state:
                    tournament['location'] = ', '.join(filter(None, [city, state]))
                
                tournaments.append(tournament)
        
        return tournaments
    except Exception as e:
        print(f"Error fetching upcoming tournaments: {e}")
        return []


def search_tournaments(query: str, time: str = "both"):
    """Search tournaments from Tabroom API"""
    try:
        # Encode the search query
        encoded_query = requests.utils.quote(query)
        url = f'https://api.tabroom.com/v1/public/search/{time}/{encoded_query}'
        
        response = requests.get(url, headers=DEFAULT_HEADERS, timeout=20)
        response.raise_for_status()
        data = response.json()
        
        # Transform the data to match our frontend format
        tournaments = []
        if isinstance(data, list):
            for item in data:
                tournament = {
                    'id': str(item.get('id', '')),
                    'name': item.get('name', 'Unknown Tournament'),
                    'location': None,
                    'startDate': item.get('start'),
                    'endDate': item.get('end'),
                    'webname': item.get('webname')
                }
                
                # Build location string
                city = item.get('city')
                state = item.get('state')
                if city or state:
                    tournament['location'] = ', '.join(filter(None, [city, state]))
                
                tournaments.append(tournament)
        
        return tournaments
    except Exception as e:
        print(f"Error searching tournaments: {e}")
        return []


def fetch_tournament_details(tournament_id: str):
    """Get detailed information about a specific tournament from Tabroom API"""
    try:
        response = requests.get(f'https://api.tabroom.com/v1/public/invite/tourn/{tournament_id}', 
                              headers=DEFAULT_HEADERS, timeout=20)
        response.raise_for_status()
        data = response.json()
        
        # The API returns data in a 'tourn' object
        tourn_data = data.get('tourn', {})
        
        # Transform the data to match our frontend format
        tournament = {
            'id': str(tourn_data.get('id', tournament_id)),
            'name': tourn_data.get('name', 'Unknown Tournament'),
            'location': None,
            'startDate': tourn_data.get('start'),
            'endDate': tourn_data.get('end'),
            'webname': tourn_data.get('webname'),
            'websiteUrl': tourn_data.get('website') or tourn_data.get('url'),
            'events': tourn_data.get('events', []),
            'infoHtml': tourn_data.get('invite_html') or tourn_data.get('info_html')
        }
        
        # Build location string
        city = tourn_data.get('city')
        state = tourn_data.get('state')
        if city or state:
            tournament['location'] = ', '.join(filter(None, [city, state]))
        
        return tournament
    except Exception as e:
        print(f"Error fetching tournament details for {tournament_id}: {e}")
        return None


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


def fetch_dashboard_data(token: str, email: str = None) -> dict:
    """Fetch user dashboard data from Tabroom"""
    try:
        session = requests.Session()
        session.headers.update(DEFAULT_HEADERS)
        
        # Set the authentication cookie
        session.cookies.set('TabroomToken', token)
        
        # Fetch dashboard page
        response = session.get(DASHBOARD_URL, timeout=20)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # DEBUG: Let's see what we're actually getting from Tabroom
        print("=== TABROOM DASHBOARD DEBUG ===")
        print(f"Response status: {response.status_code}")
        print(f"Response URL: {response.url}")
        print(f"Page title: {soup.title.string if soup.title else 'No title'}")
        print(f"Page length: {len(response.text)} characters")
        
        # Look for any text that might contain user info
        page_text = soup.get_text()
        print(f"Page contains 'welcome': {'welcome' in page_text.lower()}")
        print(f"Page contains 'user': {'user' in page_text.lower()}")
        print(f"First 500 chars of page: {page_text[:500]}")
        
        # Extract user info - try multiple selectors
        user_name = "User"
        try:
            # Try various selectors for username
            name_selectors = [
                'span.username', 'div.userinfo', '.user-name', '.username',
                'span[class*="user"]', 'div[class*="user"]',
                'h1', 'h2', '.welcome', '.greeting'
            ]
            
            for selector in name_selectors:
                name_element = soup.select_one(selector)
                if name_element:
                    text = name_element.get_text(strip=True)
                    # Look for patterns like "Welcome, John Doe" or "John Doe"
                    if text and len(text) > 1 and not text.lower().startswith('welcome'):
                        # Extract name from "Welcome, John Doe" or just use the text
                        if ',' in text:
                            user_name = text.split(',')[1].strip()
                        else:
                            user_name = text
                        break
                    elif text and len(text) > 1 and text.lower().startswith('welcome'):
                        # Extract name from "Welcome, John Doe"
                        if ',' in text:
                            user_name = text.split(',')[1].strip()
                        break
            
            # If we still don't have a good name, try to use email as fallback
            if user_name == "User" and email:
                # Extract name from email (before @)
                if '@' in email:
                    user_name = email.split('@')[0].replace('.', ' ').title()
                else:
                    user_name = email
                    
        except Exception as e:
            print(f"Error extracting username: {e}")
            # Use email as fallback
            if email and '@' in email:
                user_name = email.split('@')[0].replace('.', ' ').title()
            elif email:
                user_name = email
        
        # Extract stats (these are common elements on Tabroom dashboard)
        stats = {
            'active_tournaments': 0,
            'upcoming_rounds': 0,
            'ballots_to_judge': 0,
            'reminders': 0
        }
        
        # Look for common dashboard elements with better parsing
        try:
            # Look for tournament-related content
            tournament_links = soup.find_all('a', href=lambda x: x and ('tournament' in x or 'tourn' in x))
            tournament_text = soup.find_all(text=lambda x: x and ('tournament' in x.lower() or 'tourn' in x.lower()))
            stats['active_tournaments'] = max(len(tournament_links), len([t for t in tournament_text if len(t.strip()) > 5]))
            
            # Look for ballot-related content
            ballot_links = soup.find_all('a', href=lambda x: x and 'ballot' in x.lower())
            ballot_text = soup.find_all(text=lambda x: x and 'ballot' in x.lower())
            stats['ballots_to_judge'] = max(len(ballot_links), len([b for b in ballot_text if 'judge' in b.lower() or 'pending' in b.lower()]))
            
            # Look for round-related content
            round_text = soup.find_all(text=lambda x: x and ('round' in x.lower() or 'upcoming' in x.lower()))
            stats['upcoming_rounds'] = len([r for r in round_text if len(r.strip()) > 3])
            
            # Look for reminder/notification content
            reminder_text = soup.find_all(text=lambda x: x and ('reminder' in x.lower() or 'notification' in x.lower() or 'alert' in x.lower()))
            stats['reminders'] = len([r for r in reminder_text if len(r.strip()) > 3])
            
            # If we still have 0s, try to find any numbers in the page that might be stats
            if all(v == 0 for v in stats.values()):
                # Look for any numbers that might be stats
                number_elements = soup.find_all(text=lambda x: x and x.strip().isdigit() and int(x.strip()) > 0)
                if number_elements:
                    # Use the first few numbers as stats
                    numbers = [int(n.strip()) for n in number_elements[:4]]
                    stats['active_tournaments'] = numbers[0] if len(numbers) > 0 else 0
                    stats['ballots_to_judge'] = numbers[1] if len(numbers) > 1 else 0
                    stats['upcoming_rounds'] = numbers[2] if len(numbers) > 2 else 0
                    stats['reminders'] = numbers[3] if len(numbers) > 3 else 0
            
        except Exception as e:
            print(f"Error extracting stats: {e}")
            pass
        
        # Extract recent activity
        recent_activity = []
        try:
            # Look for activity items (this is a simplified approach)
            activity_items = soup.find_all('div', class_='activity') or soup.find_all('li', class_='activity')
            for item in activity_items[:5]:  # Limit to 5 recent items
                text = item.get_text(strip=True)
                if text:
                    recent_activity.append({
                        'text': text,
                        'time': 'Recently'  # Tabroom doesn't always show timestamps
                    })
        except:
            pass
        
        result = {
            'user_name': user_name,
            'stats': stats,
            'recent_activity': recent_activity
        }
        
        # Debug logging
        print(f"Dashboard data extracted - User: {user_name}, Stats: {stats}")
        
        return result
        
    except Exception as e:
        print(f"Error fetching dashboard data: {e}")
        return {
            'user_name': 'User',
            'stats': {'active_tournaments': 0, 'upcoming_rounds': 0, 'ballots_to_judge': 0, 'reminders': 0},
            'recent_activity': []
        }


def fetch_user_tournaments(token: str) -> list:
    """Fetch user's future tournaments from Tabroom with proper event parsing"""
    try:
        session = requests.Session()
        session.headers.update(DEFAULT_HEADERS)
        session.cookies.set('TabroomToken', token)
        
        # Try to fetch from the competitor records page which shows current/future tournaments
        response = session.get("https://www.tabroom.com/user/student/index.mhtml", timeout=20)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        tournaments = []
        
        print("=== FETCHING USER TOURNAMENTS DEBUG ===")
        print(f"Response status: {response.status_code}")
        print(f"Response URL: {response.url}")
        
        # Look for tournament tables in different ways
        tables = soup.find_all('table')
        print(f"Found {len(tables)} tables on the page")
        
        tournament_table = None
        for i, table in enumerate(tables):
            rows = table.find_all('tr')
            if len(rows) > 1:  # Has at least header + data rows
                # Check if this looks like a tournament table
                header_cols = rows[0].find_all(['td', 'th'])
                header_text = [col.get_text(strip=True).lower() for col in header_cols]
                print(f"Table {i} headers: {header_text}")
                
                # Look for tournament-related headers
                if any(keyword in ' '.join(header_text) for keyword in ['tournament', 'event', 'date', 'status', 'name']):
                    tournament_table = table
                    print(f"Using table {i} as tournament table")
                    break
        
        if tournament_table:
            rows = tournament_table.find_all('tr')
            print(f"Found {len(rows)} rows in tournament table")
            
            # Debug: Print header row to understand structure
            if len(rows) > 0:
                header_cols = rows[0].find_all(['td', 'th'])
                print(f"Header columns: {[col.get_text(strip=True) for col in header_cols]}")
            
            for i, row in enumerate(rows[1:], 1):  # Skip header row
                cols = row.find_all(['td', 'th'])
                print(f"Row {i}: {len(cols)} columns")
                if len(cols) >= 3:  # At least Tournament, Date, Status
                    try:
                        # Extract tournament name
                        name_elem = cols[0].find('a') or cols[0]
                        name = name_elem.get_text(strip=True)
                        
                        # Extract date
                        date_text = cols[1].get_text(strip=True)
                        
                        # Extract event - try different column positions
                        event_text = None
                        if len(cols) > 2:
                            event_text = cols[2].get_text(strip=True)
                        elif len(cols) > 3:
                            event_text = cols[3].get_text(strip=True)
                        
                        # Extract status - try different column positions
                        status_text = 'Upcoming'
                        if len(cols) > 4:
                            status_text = cols[4].get_text(strip=True)
                        elif len(cols) > 3:
                            status_text = cols[3].get_text(strip=True)
                        
                        print(f"  Tournament: {name}")
                        print(f"  Date: {date_text}")
                        print(f"  Event: {event_text}")
                        print(f"  Status: {status_text}")
                        
                        # Only include future tournaments (not completed ones)
                        if name and len(name) > 3:
                            # Convert date to ISO format and check if it's in the future
                            iso_date = None
                            is_future = True
                            
                            if date_text and date_text != 'TBD':
                                try:
                                    from datetime import datetime
                                    
                                    # Skip if date looks like a tournament name (contains common tournament words)
                                    if any(word in date_text.lower() for word in ['swing', 'classic', 'tournament', 'tfa', 'ni', 'etoc']):
                                        print(f"Skipping tournament with invalid date (looks like name): {name} - {date_text}")
                                        is_future = False
                                    else:
                                        # Handle different date formats
                                        if ',' in date_text:
                                            parsed_date = datetime.strptime(date_text, '%b %d, %Y')
                                        else:
                                            # Try other formats
                                            parsed_date = datetime.strptime(date_text, '%b %d %Y')
                                        iso_date = parsed_date.isoformat()
                                        
                                        # Only include future tournaments (at least 1 day in the future)
                                        today = datetime.now().date()
                                        tournament_date = parsed_date.date()
                                        
                                        if tournament_date < today:
                                            print(f"Skipping past tournament: {name} - {date_text} (was on {tournament_date})")
                                            is_future = False
                                        elif tournament_date == today:
                                            # Only include today's tournaments if they're confirmed/waitlisted
                                            if 'confirmed' not in status_text.lower() and 'waitlisted' not in status_text.lower():
                                                print(f"Skipping today's tournament (not confirmed): {name} - {date_text}")
                                                is_future = False
                                except ValueError as e:
                                    print(f"Could not parse date '{date_text}' for tournament '{name}': {e}")
                                    # If we can't parse the date, be conservative and skip it
                                    is_future = False
                            
                            if is_future:
                                # Clean up event text - remove extra whitespace and newlines
                                event = None
                                if event_text and event_text != 'TBD' and event_text.strip():
                                    # Clean up the event text
                                    event = ' '.join(event_text.split())  # Remove extra whitespace
                                    # Remove common non-event text
                                    if event.lower() in ['info', 'details', 'view', '']:
                                        event = None
                                
                                # Determine status
                                if 'Confirmed' in status_text:
                                    status = 'Confirmed'
                                elif 'Waitlisted' in status_text:
                                    status = 'Waitlisted'
                                else:
                                    status = 'Upcoming'
                                
                                tournaments.append({
                                    'id': f"tournament_{len(tournaments) + 1}",
                                    'name': name,
                                    'status': status,
                                    'dateIso': iso_date,
                                    'event': event
                                })
                                
                                print(f"Found tournament: {name} - {status} - {date_text} - {event}")
                    except Exception as e:
                        print(f"Error processing tournament row {i}: {e}")
                        continue
        
        # If no future tournaments found in the specific section, try a more general approach
        if not tournaments:
            print("No future tournaments found in specific section, trying general search...")
            # Look for any tournament tables
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cols = row.find_all(['td', 'th'])
                    if len(cols) >= 3:
                        name_elem = cols[0].find('a') or cols[0]
                        name = name_elem.get_text(strip=True)
                        
                        if name and len(name) > 3 and 'tournament' not in name.lower():
                            # Check if this looks like a future tournament
                            row_text = row.get_text().lower()
                            if any(word in row_text for word in ['confirmed', 'waitlisted', 'upcoming', 'future']):
                                tournaments.append({
                                    'id': f"tournament_{len(tournaments) + 1}",
                                    'name': name,
                                    'status': 'Upcoming',
                                    'dateIso': None,
                                    'event': None
                                })
        
        print(f"Total future tournaments found: {len(tournaments)}")
        return tournaments
        
    except Exception as e:
        print(f"Error fetching tournaments: {e}")
        return []


