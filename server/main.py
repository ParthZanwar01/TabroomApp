from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
from uuid import uuid4

from .tabroom_api import login_tabroom, fetch_ballots, login_tabroom_debug, browser_login_get_token, browser_login_via_home_popup

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    cookie_name: str | None = None


@app.post("/cookie-login", response_model=TokenResponse)
def cookie_login(req: LoginRequest):
    try:
        token = login_tabroom(req.email, req.password)
        return TokenResponse(token=token)
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
        data = login_tabroom_debug(req.email, req.password)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Simple in-memory session store. For production, replace with Redis or a DB.
_sessions: Dict[str, str] = {}


class SessionResponse(BaseModel):
    sessionId: str


@app.post("/session-login", response_model=SessionResponse)
def session_login(req: LoginRequest):
    try:
        token = login_tabroom(req.email, req.password)
        session_id = str(uuid4())
        _sessions[session_id] = token
        return SessionResponse(sessionId=session_id)
    except Exception as e:
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
    email: str
    password: str
    headless: bool = True


@app.post("/browser-login", response_model=TokenResponse)
def browser_login(req: BrowserLoginRequest):
    try:
        # Prefer homepage popup flow to match user's desired approach
        token, cookie_name = browser_login_via_home_popup(req.email, req.password, headless=req.headless)
        return TokenResponse(token=token, cookie_name=cookie_name)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

