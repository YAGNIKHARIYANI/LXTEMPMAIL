import os
from fastapi import FastAPI, Header, HTTPException, Query, Response
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from tempmail_api import TempMailClient

app = FastAPI(title="Live Temp Mail Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = TempMailClient()

def extract_bearer_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    if authorization.startswith("Bearer "):
        return authorization[7:].strip()
    return authorization.strip()

@app.post("/api/mailbox")
def create_mailbox():
    """Generates a new live temporary mailbox and authentication token."""
    try:
        data = client.create_mailbox()
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/mailbox")
def get_mailbox(authorization: Optional[str] = Header(None)):
    """Retrieves current temporary mailbox info using the JWT token."""
    token = extract_bearer_token(authorization)
    try:
        data = client.get_mailbox(token)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/messages")
def get_messages(authorization: Optional[str] = Header(None), after: Optional[str] = Query(None)):
    """Fetches list of received messages for the active mailbox."""
    token = extract_bearer_token(authorization)
    try:
        data = client.get_messages(token, after=after)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/messages/{message_id}")
def get_message(message_id: str, authorization: Optional[str] = Header(None)):
    """Retrieves full content of a specific message including HTML body and attachments."""
    token = extract_bearer_token(authorization)
    try:
        data = client.get_message(token, message_id)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/messages/{message_id}")
def delete_message(message_id: str, authorization: Optional[str] = Header(None)):
    """Deletes a message from the temporary inbox."""
    token = extract_bearer_token(authorization)
    try:
        data = client.delete_message(token, message_id)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/messages/{message_id}/source")
def get_message_source(message_id: str, authorization: Optional[str] = Header(None)):
    """Retrieves the raw source / EML of the message."""
    token = extract_bearer_token(authorization)
    try:
        source_text = client.get_message_source(token, message_id)
        return Response(content=source_text, media_type="text/plain; charset=utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/messages/{message_id}/attachment/{attachment_id}")
def get_attachment(message_id: str, attachment_id: str, authorization: Optional[str] = Header(None)):
    """Downloads an attachment file."""
    token = extract_bearer_token(authorization)
    try:
        content_bytes, content_type, filename = client.get_attachment(token, message_id, attachment_id)
        return Response(
            content=content_bytes,
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Mount static files directory
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
def index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h1>Temp Mail Server Running</h1><p>Static files missing.</p>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
