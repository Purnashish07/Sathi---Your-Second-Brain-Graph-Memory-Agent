import os
import time
from collections import Counter
from difflib import SequenceMatcher

try:
    from falkordb import FalkorDB  # type: ignore[import-not-found]
    db = FalkorDB(host=os.getenv("FALKOR_HOST", "localhost"), port=int(os.getenv("FALKOR_PORT", "6379")))
    graph = db.select_graph("SathiMemory")
    USE_MOCK = False
except Exception:
    USE_MOCK = True
    graph = None

MOCK_STORE = {"nodes": []}

# ── Synonym expansion map for fuzzy search ──────────────────────────────
SYNONYMS = {
    "auth":       ["jwt", "token", "login", "session", "authentication", "authorization", "expired", "credential", "oauth", "refresh"],
    "cors":       ["cross-origin", "middleware", "allow_origins", "headers", "origin", "preflight"],
    "react":      ["state", "hook", "component", "jsx", "useEffect", "useState", "setData", "render", "virtual-dom", "redux"],
    "api":        ["endpoint", "route", "request", "response", "fetch", "rest", "graphql", "webhook"],
    "database":   ["db", "query", "sql", "mongo", "redis", "postgres", "mysql", "migration"],
    "css":        ["style", "layout", "flex", "grid", "responsive", "tailwind", "animation"],
    "error":      ["bug", "crash", "fail", "exception", "traceback", "throw", "undefined", "null"],
    "payment":    ["stripe", "checkout", "billing", "invoice", "transaction", "subscription"],
    "memory":     ["leak", "heap", "garbage", "cleanup", "useEffect", "unmount"],
    "performance":["slow", "optimize", "cache", "lazy", "bundle", "chunk", "lighthouse"],
}


# ── Helpers ──────────────────────────────────────────────────────────────

def run_query(cypher, params={}):
    if USE_MOCK:
        return []
    try:
        return graph.query(cypher, params).result_set
    except Exception:
        return []


def add_bug_memory(user_id, bug_desc, file_name, solution, tags):
    MOCK_STORE["nodes"].append({
        "user": user_id,
        "bug": bug_desc,
        "file": file_name,
        "solution": solution,
        "tags": tags,
        "timestamp": time.time(),
    })
    return True


# ── Fuzzy search engine ─────────────────────────────────────────────────

def _expand_query(query):
    """Expand query tokens with synonyms for fuzzy matching."""
    query_tokens = set(query.lower().split())
    expanded = set(query_tokens)
    for token in query_tokens:
        for key, syns in SYNONYMS.items():
            if token == key or token in syns:
                expanded.add(key)
                expanded.update(syns)
    return expanded


def _fuzzy_score(query, node, expanded_tokens):
    """Score a node against a query using multiple signals."""
    query_lower = query.lower()
    score = 0
    text_blob = f"{node['bug']} {node['solution']} {node.get('file', '')}".lower()
    tags = set(t.lower() for t in node.get("tags", []))

    # Signal 1: Direct substring match (strongest)
    if query_lower in text_blob:
        score += 10

    # Signal 2: Individual expanded-token matches in text
    for token in expanded_tokens:
        if token in text_blob:
            score += 3

    # Signal 3: Tag matches (very strong — tags are curated)
    for token in expanded_tokens:
        if token in tags:
            score += 5

    # Signal 4: Fuzzy string similarity (catches typos / partial words)
    for word in text_blob.split():
        ratio = SequenceMatcher(None, query_lower, word).ratio()
        if ratio > 0.7:
            score += int(ratio * 4)

    return score


def search_memory(user_id, query):
    """Fuzzy multi-signal search across bug memories."""
    start = time.perf_counter()
    expanded = _expand_query(query)
    scored_results = []

    for n in MOCK_STORE["nodes"]:
        if n["user"] != user_id:
            continue
        score = _fuzzy_score(query, n, expanded)
        if score > 0:
            result = dict(n)
            result["_relevance_score"] = score
            scored_results.append((score, result))

    scored_results.sort(key=lambda x: x[0], reverse=True)
    elapsed = round((time.perf_counter() - start) * 1000, 2)

    results = [r[1] for r in scored_results]
    # Attach timing to first result for convenience
    if results:
        results[0]["_search_time_ms"] = elapsed
    return results


# ── Stats & History ─────────────────────────────────────────────────────

def get_user_history(user_id):
    return [n for n in MOCK_STORE["nodes"] if n["user"] == user_id][-10:]


def get_graph_stats():
    node_count = len(MOCK_STORE["nodes"])
    unique_files = len(set(n["file"] for n in MOCK_STORE["nodes"])) if MOCK_STORE["nodes"] else 0
    unique_users = len(set(n["user"] for n in MOCK_STORE["nodes"])) if MOCK_STORE["nodes"] else 0
    all_tags = [t for n in MOCK_STORE["nodes"] for t in n.get("tags", [])]
    return {
        "nodes": node_count * 3 + unique_files + unique_users,
        "edges": node_count * 3 + len(all_tags),
        "bugs": node_count,
        "unique_files": unique_files,
        "unique_users": unique_users,
        "unique_tags": len(set(all_tags)),
        "mode": "MOCK (works without docker)" if USE_MOCK else "FalkorDB Live 🟢",
    }


# ── Buggy files & concept map ───────────────────────────────────────────

def get_buggy_files():
    files = [n["file"] for n in MOCK_STORE["nodes"]]
    c = Counter(files)
    total = sum(c.values()) or 1
    return [{"file": f, "bugCount": cnt, "riskScore": round(cnt / total * 100, 1)} for f, cnt in c.most_common()]


def get_concept_map(user_id):
    tags_all = [t for n in MOCK_STORE["nodes"] if n["user"] == user_id for t in n.get("tags", [])]
    c = Counter(tags_all)
    return [{"concept": k, "count": v} for k, v in c.most_common()]


# ── Full graph (for canvas viz) ─────────────────────────────────────────

def get_full_graph(user_id):
    nodes, edges = [], []
    for i, n in enumerate(MOCK_STORE["nodes"]):
        if n["user"] != user_id:
            continue
        bug_id = f"bug_{i}"
        file_id = f"file_{n['file']}"
        sol_id = f"sol_{i}"
        user_node_id = f"user_{n['user']}"

        nodes.append({"id": user_node_id, "label": n["user"], "group": "user"})
        nodes.append({"id": bug_id, "label": n["bug"][:40], "group": "bug"})
        nodes.append({"id": file_id, "label": n["file"], "group": "file"})
        nodes.append({"id": sol_id, "label": n["solution"][:30], "group": "solution"})

        edges.append({"from": user_node_id, "to": bug_id, "label": "FACED"})
        edges.append({"from": bug_id, "to": file_id, "label": "IN_FILE"})
        edges.append({"from": bug_id, "to": sol_id, "label": "FIXED_BY"})

        for tag in n.get("tags", []):
            tag_id = f"tag_{tag}"
            nodes.append({"id": tag_id, "label": f"#{tag}", "group": "tag"})
            edges.append({"from": bug_id, "to": tag_id, "label": "TAGGED"})

    uniq = {n["id"]: n for n in nodes}.values()
    return {"nodes": list(uniq), "edges": edges}


# ── Detective Agent (PageRank-inspired analysis) ────────────────────────

def detective_analyze(user_id):
    """PageRank-inspired analysis: find the most problematic files and patterns."""
    start = time.perf_counter()
    user_nodes = [n for n in MOCK_STORE["nodes"] if n["user"] == user_id]

    if not user_nodes:
        return {
            "report": "No data yet. Seed some memories first!",
            "buggy_files": [], "patterns": [], "multi_hop": [],
            "risk_level": "UNKNOWN", "total_bugs": 0, "total_files": 0,
        }

    file_counter = Counter(n["file"] for n in user_nodes)
    tag_counter = Counter(tag for n in user_nodes for tag in n.get("tags", []))

    buggy_files = [
        {"file": f, "bugCount": c, "riskScore": round(c / len(user_nodes) * 100, 1)}
        for f, c in file_counter.most_common()
    ]
    patterns = [{"tag": t, "frequency": c} for t, c in tag_counter.most_common(10)]

    top_file = buggy_files[0] if buggy_files else {"file": "N/A", "bugCount": 0}
    top_tag = patterns[0] if patterns else {"tag": "N/A", "frequency": 0}
    risk = "HIGH 🔴" if top_file["bugCount"] >= 3 else "MEDIUM 🟡" if top_file["bugCount"] >= 2 else "LOW 🟢"

    # Multi-hop reasoning: Bug → File → Other Bugs in same File → Their tags
    multi_hop = []
    for f, cnt in file_counter.most_common(3):
        related_bugs = [n for n in user_nodes if n["file"] == f]
        related_tags = set()
        for b in related_bugs:
            related_tags.update(b.get("tags", []))
        multi_hop.append({
            "file": f,
            "bugs": [b["bug"] for b in related_bugs],
            "connected_concepts": list(related_tags),
            "reasoning": f"File '{f}' has {cnt} bug(s) linked to concepts: {', '.join(related_tags)}",
        })

    elapsed = round((time.perf_counter() - start) * 1000, 2)
    cypher = f"MATCH (f:File)<-[:IN_FILE]-(b:Bug)<-[:FACED]-(u:User {{id:'{user_id}'}}) RETURN f.name, count(b) AS bug_count ORDER BY bug_count DESC"

    report_lines = [
        "🔍 Detective Agent Report",
        "━━━━━━━━━━━━━━━━━━━━━━━━",
        f"📊 Analyzed {len(user_nodes)} bug memories across {len(file_counter)} files",
        f"🎯 Hotspot: {top_file['file']} ({top_file['bugCount']} bugs)",
        f"🏷️  Top Pattern: #{top_tag['tag']} (appeared {top_tag['frequency']}x)",
        f"⚠️  Risk Level: {risk}",
        "",
        "Multi-hop Insight: Files with recurring bugs share common tags,",
        f"suggesting systemic issues in {', '.join(t['tag'] for t in patterns[:3])}.",
    ]

    return {
        "report": "\n".join(report_lines),
        "buggy_files": buggy_files,
        "patterns": patterns,
        "multi_hop": multi_hop,
        "risk_level": risk,
        "cypher_used": cypher,
        "total_bugs": len(user_nodes),
        "total_files": len(file_counter),
        "analysis_time_ms": elapsed,
    }


# ── Explainability ──────────────────────────────────────────────────────

def get_explainability(user_id, query, search_results):
    """Generate explainability data for a search query."""
    expanded = _expand_query(query)

    cypher = (
        f"MATCH (u:User {{id:'{user_id}'}})-[:FACED]->(b:Bug)-[:IN_FILE]->(f:File) "
        f"WHERE b.desc CONTAINS '{query}' RETURN u, b, f"
    )

    path_steps = [
        {"step": 1, "node": f"User:{user_id}", "type": "user", "action": "START"},
        {"step": 2, "edge": "FACED", "action": "TRAVERSE"},
    ]

    if search_results:
        first = search_results[0] if isinstance(search_results[0], dict) else {"bug": str(search_results[0])}
        path_steps.extend([
            {"step": 3, "node": f"Bug:{first.get('bug', '?')[:30]}", "type": "bug", "action": "MATCH"},
            {"step": 4, "edge": "IN_FILE", "action": "TRAVERSE"},
            {"step": 5, "node": f"File:{first.get('file', '?')}", "type": "file", "action": "MATCH"},
            {"step": 6, "edge": "FIXED_BY", "action": "TRAVERSE"},
            {"step": 7, "node": f"Solution:{first.get('solution', '?')[:30]}", "type": "solution", "action": "RESULT"},
        ])

    return {
        "cypher_query": cypher,
        "expanded_tokens": list(expanded),
        "traversal_path": path_steps,
        "signals_used": ["tag_match", "keyword_expansion", "substring_match", "fuzzy_similarity"],
        "graph_model": "(User)-[:FACED]->(Bug)-[:IN_FILE]->(File)-[:FIXED_BY]->(Solution)",
        "results_count": len(search_results),
    }