
from graph_db import add_bug_memory, search_memory, get_user_history

# ── Keyword → category mapping (much richer than a flat list) ────────────
KEYWORD_MAP = {
    "auth":       ["auth", "jwt", "token", "login", "session", "oauth", "credential", "expired", "refresh", "password", "signup", "register"],
    "cors":       ["cors", "cross-origin", "middleware", "allow_origins", "origin", "preflight", "headers"],
    "react":      ["react", "state", "hook", "component", "jsx", "useeffect", "usestate", "setdata", "render", "redux", "context"],
    "api":        ["api", "endpoint", "route", "request", "response", "fetch", "rest", "graphql", "webhook", "axios"],
    "database":   ["database", "db", "query", "sql", "mongo", "redis", "postgres", "mysql", "migration", "schema"],
    "css":        ["css", "style", "layout", "flex", "grid", "responsive", "tailwind", "animation", "scss"],
    "error":      ["error", "bug", "crash", "fail", "exception", "traceback", "throw", "undefined", "null", "nan"],
    "payment":    ["payment", "stripe", "checkout", "billing", "invoice", "transaction", "subscription"],
    "memory":     ["memory", "leak", "heap", "garbage", "cleanup", "unmount"],
    "python":     ["python", "pip", "venv", "django", "flask", "fastapi", "uvicorn"],
    "javascript": ["javascript", "js", "node", "npm", "typescript", "ts", "deno", "bun"],
    "middleware":  ["middleware", "interceptor", "filter", "handler", "proxy"],
    "deployment": ["deploy", "docker", "kubernetes", "ci", "cd", "pipeline", "nginx", "vercel", "aws"],
}


def extract_tags(text: str):
    """Extract semantic tags from text using keyword matching."""
    text_lower = text.lower()
    found_tags = set()
    for category, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            if kw in text_lower:
                found_tags.add(category)
                break
    return list(found_tags) or ["general"]


def remember_interaction(user_id: str, bug_desc: str, file_name: str, solution: str):
    tags = extract_tags(bug_desc + " " + solution + " " + file_name)
    add_bug_memory(user_id, bug_desc, file_name, solution, tags)
    return {"tags": tags}


def recall(user_id: str, query: str):
    memories = search_memory(user_id, query)
    return memories
