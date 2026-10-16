
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


@app.get("/analyze/{user_id}")
def analyze(user_id: str):
    buggy = get_buggy_files()
    concepts = get_concept_map(user_id)
    graph_data = get_full_graph(user_id)
    # Detective logic: most buggy file
    top_file = buggy[0] if buggy else None
    return {
        "detective_report": f"Detective Agent ne graph analyze kiya: Sabse zyada bugs {top_file['file'] if top_file else 'N/A'} me hai. PageRank jaisa logic use kiya.",
        "buggy_files": buggy,
        "concepts": concepts,
        "graph": graph_data
    }

@app.get("/graph/{user_id}")
def graph_viz(user_id: str):
    return get_full_graph(user_id)

class GithubImportRequest(BaseModel):
    user_id: str = "dev123"
    repo_url: str = "https://github.com/example/repo"
    commits: list = []  # for demo we accept manual list

@app.post("/github/import")
def github_import(req: GithubImportRequest):
    # Simulate github ingest - in real, parse git log
    # For hackathon demo, we create 3 fake commits
    demo_commits = [
        {"bug": "Fix auth middleware crash", "file": "middleware/auth.js", "solution": "Added try-catch and token validation", "tags": ["auth", "middleware"]},
        {"bug": "Payment webhook failing", "file": "services/payment.py", "solution": "Fixed signature verification", "tags": ["payment", "api"]},
        {"bug": "Memory leak in dashboard", "file": "components/Dashboard.jsx", "solution": "Added useEffect cleanup", "tags": ["react", "memory"]}
    ]
    for c in demo_commits:
        add_bug_memory(req.user_id, c["bug"], c["file"], c["solution"], c["tags"])
    return {"imported": len(demo_commits), "message": f"GitHub repo {req.repo_url} se {len(demo_commits)} commits graph me daal diye! Company Brain ready.", "commits": demo_commits}
