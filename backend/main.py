
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from graph_db import (
    get_user_history, get_graph_stats, USE_MOCK, get_buggy_files,
    get_concept_map, get_full_graph, MOCK_STORE, add_bug_memory,
    detective_analyze, get_explainability, search_memory,
)

app = FastAPI(
    title="Sathi - Graph Memory Agent",
    description="FalkorDB Hackathon Track 02: Memory & Coordination",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

from agents import MemoryWriterAgent, MemoryReaderAgent
writer = MemoryWriterAgent()
reader = MemoryReaderAgent()


# ── Request Models ───────────────────────────────────────────────────────

class RememberRequest(BaseModel):
    user_id: str = "dev123"
    bug: str
    file: str
    solution: str

class AskRequest(BaseModel):
    user_id: str = "dev123"
    query: str

class GithubImportRequest(BaseModel):
    user_id: str = "dev123"
    repo_url: str = "https://github.com/example/repo"
    commits: list = []


# ── Endpoints ────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message": "Sathi Agent Running",
        "mode": "MOCK" if USE_MOCK else "FalkorDB",
        "track": "Agent Memory and Coordination",
    }


@app.get("/stats")
def stats():
    return get_graph_stats()


@app.post("/remember")
def remember(req: RememberRequest):
    start = time.perf_counter()
    res = writer.process(req.user_id, req.bug, req.file, req.solution)
    elapsed = round((time.perf_counter() - start) * 1000, 2)
    return {"status": "saved", "message": res, "write_time_ms": elapsed}


@app.post("/ask")
def ask(req: AskRequest):
    start = time.perf_counter()
    res = reader.process(req.user_id, req.query)
    elapsed = round((time.perf_counter() - start) * 1000, 2)

    # Attach explainability data
    memories = search_memory(req.user_id, req.query)
    explain = get_explainability(req.user_id, req.query, memories)

    res["query_time_ms"] = elapsed
    res["explain"] = explain
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
                out.append({"bug": item[0], "solution": item[1] if len(item) > 1 else ""})
            except Exception:
                out.append({"raw": str(item)})
    return {"user_id": user_id, "history": out}


@app.get("/demo-seed/{user_id}")
def seed(user_id: str):
    writer.process(user_id, "JWT token expired error", "auth.js", "Added refresh token logic and increased expiry to 7d")
    writer.process(user_id, "CORS error on /api/login", "server.py", "Added cors middleware allow_origins=*")
    writer.process(user_id, "React state not updating", "Dashboard.jsx", "Used functional update setData(prev=>...)")
    return {"seeded": True, "message": "3 memories added for demo"}


@app.get("/analyze/{user_id}")
def analyze(user_id: str):
    return detective_analyze(user_id)


@app.get("/graph/{user_id}")
def graph_viz(user_id: str):
    return get_full_graph(user_id)


@app.post("/github/import")
def github_import(req: GithubImportRequest):
    demo_commits = [
        {"bug": "Fix auth middleware crash", "file": "middleware/auth.js", "solution": "Added try-catch and token validation", "tags": ["auth", "middleware"]},
        {"bug": "Payment webhook failing", "file": "services/payment.py", "solution": "Fixed signature verification", "tags": ["payment", "api"]},
        {"bug": "Memory leak in dashboard", "file": "components/Dashboard.jsx", "solution": "Added useEffect cleanup", "tags": ["react", "memory"]},
    ]
    for c in demo_commits:
        add_bug_memory(req.user_id, c["bug"], c["file"], c["solution"], c["tags"])
    return {
        "imported": len(demo_commits),
        "message": f"GitHub repo {req.repo_url} se {len(demo_commits)} commits graph me daal diye!",
    }
