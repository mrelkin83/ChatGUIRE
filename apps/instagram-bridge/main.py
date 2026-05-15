from fastapi import FastAPI, HTTPException, Body
from instagrapi import Client
from pydantic import BaseModel
import os
from typing import Optional

app = FastAPI()

class LoginData(BaseModel):
    username: str
    password: str
    proxy: Optional[str] = None

class MessageData(BaseModel):
    username: str
    thread_id: str
    text: str

clients = {}

@app.post("/login")
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

@app.post("/send_message")
def send_message(data: MessageData):
    if data.username not in clients:
        raise HTTPException(status_code=404, detail="Client not logged in")
    
    try:
        cl = clients[data.username]
        result = cl.direct_answer(data.thread_id, data.text)
        return {"status": "success", "message_id": result.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/get_directs/{username}")
def get_directs(username: str):
    if username not in clients:
        raise HTTPException(status_code=404, detail="Client not logged in")
    
    try:
        cl = clients[username]
        threads = cl.direct_threads()
        return {"status": "success", "threads": [t.dict() for t in threads]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
