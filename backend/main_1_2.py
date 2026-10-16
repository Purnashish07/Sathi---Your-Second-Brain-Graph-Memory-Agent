
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .graph_db import get_user_history, get_graph_stats, USE_MOCK
from .agents import MemoryWriterAgent, MemoryReaderAgent
import os

app = FastAPI(title="Sathi - Graph Memory Agent")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
writer = MemoryWriterAgent()
reader = MemoryReaderAgent()

class RememberRequest(BaseModel):
    user_id: str = "dev123"
    bug: str
    file: str
    solution: str

class AskRequest(BaseModel):
    user_id: str = "dev123"
    query: str

@app.get("/")
def root():
    return {"message": "Sathi Agent Running", "mode": "MOCK" if USE_MOCK else "FalkorDB", "track": "Agent Memory and Coordination"}

@app.get("/stats")
def stats():
    return get_graph_stats()

@app.post("/remember")
def remember(req: RememberRequest):
    res = writer.process(req.user_id, req.bug, req.file, req.solution)
    return {"status": "saved", "message": res}

@app.post("/ask")
def ask(req: AskRequest):
    res = reader.process(req.user_id, req.query)
    return res

@app.get("/history/{user_id}")
def history(user_id: str):
    h = get_user_history(user_id)
    out = []
    for item in h:
        if isinstance(item, dict):
            out.append(item)
        else:
            try:
                out.append({"bug": item[0], "solution": item[1] if len(item)>1 else ""})
            except:
                out.append({"raw": str(item)})
    return {"user_id": user_id, "history": out}

@app.get("/demo-seed/{user_id}")
def seed(user_id: str):
    writer.process(user_id, "JWT token expired error", "auth.js", "Added refresh token logic and increased expiry to 7d")
    writer.process(user_id, "CORS error on /api/login", "server.py", "Added cors middleware allow_origins=*")
    writer.process(user_id, "React state not updating", "Dashboard.jsx", "Used functional update setData(prev=>...)")
    return {"seeded": True, "message": "3 memories added for demo. Now try asking 'auth fail' or 'cors'"}
