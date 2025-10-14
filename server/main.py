from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, Union
from uuid import uuid4
import requests

from tabroom_api import login_tabroom, fetch_ballots, login_tabroom_debug, browser_login_get_token, browser_login_via_home_popup, fetch_dashboard_data, fetch_user_tournaments, extract_user_info_from_dashboard, list_upcoming_tournaments, search_tournaments, fetch_tournament_details

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Tabroom API Server", "status": "running"}

@app.get("/health")
def health():
    return {"ok": True}


class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str
    
    def get_identifier(self) -> str:
        """Get the email or username for login"""
        return self.email or self.username or ""


class TokenResponse(BaseModel):
    token: str
    cookie_name: Optional[str] = None


@app.post("/cookie-login", response_model=TokenResponse)
def cookie_login(req: LoginRequest):
    try:
        token = login_tabroom(req.get_identifier(), req.password)
        # Create a session for the token
        session_id = str(uuid4())
        _sessions[session_id] = token
        print(f"Created session {session_id} with token: {token[:20]}...")
        return TokenResponse(token=session_id)  # Return session ID instead of raw token
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


class BallotsRequest(BaseModel):
    token: Optional[str] = None
    sessionId: Optional[str] = None


@app.post("/ballots")
def ballots(req: BallotsRequest):
    try:
        token: Optional[str] = req.token
        if not token:
            if not req.sessionId:
                raise HTTPException(status_code=400, detail="token or sessionId required")
            token = _sessions.get(req.sessionId)
            if not token:
                raise HTTPException(status_code=401, detail="Invalid or expired sessionId")
        html = fetch_ballots(token)
        return {"html": html}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/cookie-login-debug")
def cookie_login_debug(req: LoginRequest):
    try:
        data = login_tabroom_debug(req.get_identifier(), req.password)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Simple in-memory session store. For production, replace with Redis or a DB.
_sessions: Dict[str, str] = {}


class SessionResponse(BaseModel):
    sessionId: str


@app.post("/login", response_model=SessionResponse)
def login(req: LoginRequest):
    try:
        token = login_tabroom(req.get_identifier(), req.password)
        session_id = str(uuid4())
        _sessions[session_id] = token
        return SessionResponse(sessionId=session_id)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.post("/session-login", response_model=SessionResponse)
def session_login(req: LoginRequest):
    try:
        print(f"Session login attempt for: {req.get_identifier()}")
        token = login_tabroom(req.get_identifier(), req.password)
        session_id = str(uuid4())
        _sessions[session_id] = token
        print(f"Created session {session_id} with token: {token[:20]}...")
        
        # Try to extract user info immediately after login
        try:
            session = requests.Session()
            session.headers.update({
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.tabroom.com/",
            })
            session.cookies.set('TabroomToken', token)
            user_info = extract_user_info_from_dashboard(session, req.get_identifier())
            print(f"Extracted user info during login: {user_info}")
        except Exception as e:
            print(f"Could not extract user info during login: {e}")
        
        return SessionResponse(sessionId=session_id)
    except Exception as e:
        print(f"Session login failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))


class LogoutRequest(BaseModel):
    sessionId: str


@app.post("/session-logout")
def session_logout(req: LogoutRequest):
    # Remove the session mapping if it exists
    if req.sessionId in _sessions:
        del _sessions[req.sessionId]
    return {"ok": True}


class BrowserLoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str
    headless: bool = True
    
    def get_identifier(self) -> str:
        """Get the email or username for login"""
        return self.email or self.username or ""


@app.post("/browser-login", response_model=TokenResponse)
def browser_login(req: BrowserLoginRequest):
    try:
        # Prefer homepage popup flow to match user's desired approach
        token, cookie_name = browser_login_via_home_popup(req.get_identifier(), req.password, headless=req.headless)
        return TokenResponse(token=token, cookie_name=cookie_name)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


class DashboardRequest(BaseModel):
    sessionId: str


@app.post("/dashboard")
def get_dashboard_data(req: DashboardRequest):
    try:
        print(f"Dashboard request for sessionId: {req.sessionId}")
        print(f"Available sessions: {list(_sessions.keys())}")
        token = _sessions.get(req.sessionId)
        if not token:
            print(f"Session {req.sessionId} not found in sessions")
            raise HTTPException(status_code=401, detail="Invalid or expired sessionId")
        
        print(f"Found token for session {req.sessionId}: {token[:20]}...")
        dashboard_data = fetch_dashboard_data(token)
        return dashboard_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in dashboard endpoint: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/user-tournaments")
def get_user_tournaments(req: DashboardRequest):
    try:
        token = _sessions.get(req.sessionId)
        if not token:
            raise HTTPException(status_code=401, detail="Invalid or expired sessionId")
        
        tournaments = fetch_user_tournaments(token)
        return {"tournaments": tournaments}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/active-tournaments")
def get_active_tournaments(sessionId: str):
    try:
        print(f"Active tournaments request for sessionId: {sessionId}")
        token = _sessions.get(sessionId)
        if not token:
            raise HTTPException(status_code=401, detail="Invalid or expired sessionId")
        
        tournaments = fetch_user_tournaments(token)
        return {"tournaments": tournaments}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in active-tournaments endpoint: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/tournaments/upcoming")
def get_upcoming_tournaments():
    try:
        print("Fetching upcoming tournaments")
        tournaments = list_upcoming_tournaments()
        return {"tournaments": tournaments}
    except Exception as e:
        print(f"Error fetching upcoming tournaments: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/tournaments/search")
def search_tournaments_endpoint(q: str, time: str = "both"):
    try:
        print(f"Searching tournaments: {q}, time: {time}")
        tournaments = search_tournaments(q, time)
        return {"tournaments": tournaments}
    except Exception as e:
        print(f"Error searching tournaments: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/tournament/{tournament_id}")
def get_tournament_details(tournament_id: str, sessionId: Optional[str] = None):
    try:
        print(f"Fetching tournament details for ID: {tournament_id}")
        tournament = fetch_tournament_details(tournament_id)
        if tournament is None:
            raise HTTPException(status_code=404, detail="Tournament not found")
        return tournament
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching tournament details: {e}")
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

