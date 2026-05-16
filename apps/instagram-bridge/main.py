from fastapi import FastAPI, HTTPException, Header, Depends
from instagrapi import Client
from pydantic import BaseModel
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "")


def verify_secret(x_bridge_secret: str = Header(...)):
    if not BRIDGE_SECRET:
        raise HTTPException(status_code=500, detail="BRIDGE_SECRET not configured")
    if x_bridge_secret != BRIDGE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid bridge secret")


class LoginData(BaseModel):
    username: str
    password: str
    proxy: Optional[str] = None


class MessageData(BaseModel):
    username: str
    thread_id: str
    text: str


# In-memory session store — sessions are lost on restart; callers must re-login
clients: dict[str, Client] = {}


@app.post("/login", dependencies=[Depends(verify_secret)])
def login(data: LoginData):
    try:
        cl = Client()
        if data.proxy:
            cl.set_proxy(data.proxy)
        cl.login(data.username, data.password)
        clients[data.username] = cl
        return {"status": "success", "username": data.username}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/send_message", dependencies=[Depends(verify_secret)])
def send_message(data: MessageData):
    cl = clients.get(data.username)
    if cl is None:
        raise HTTPException(status_code=404, detail="Client not logged in")
    try:
        result = cl.direct_answer(data.thread_id, data.text)
        return {"status": "success", "message_id": result.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/get_directs/{username}", dependencies=[Depends(verify_secret)])
def get_directs(username: str):
    cl = clients.get(username)
    if cl is None:
        raise HTTPException(status_code=404, detail="Client not logged in")
    try:
        threads = cl.direct_threads()
        return {"status": "success", "threads": [t.dict() for t in threads]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "sessions": list(clients.keys())}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
