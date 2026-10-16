
import os
from typing import Optional

try:
    from falkordb import FalkorDB
    db = FalkorDB(host=os.getenv("FALKOR_HOST","localhost"), port=int(os.getenv("FALKOR_PORT","6379")))
    graph = db.select_graph("SathiMemory")
    print("Connected to FalkorDB")
    USE_MOCK = False
except Exception as e:
    print(f"FalkorDB not connected, using mock: {e}")
    USE_MOCK = True
    graph = None

MOCK_STORE = {"nodes": []}

def run_query(cypher: str, params: dict = {}):
    if USE_MOCK:
        return []
    try:
        result = graph.query(cypher, params)
        return result.result_set
    except Exception as ex:
        print(f"Query error {ex}")
        return []

def add_bug_memory(user_id: str, bug_desc: str, file_name: str, solution: str, tags: list):
    if USE_MOCK:
        MOCK_STORE["nodes"].append({"user": user_id, "bug": bug_desc, "file": file_name, "solution": solution, "tags": tags})
        return True
    q = """
    MERGE (u:User {id: $user_id})
    CREATE (b:Bug {desc: $bug_desc, created: timestamp(), tags: $tags})
    MERGE (f:File {name: $file_name})
    MERGE (s:Solution {text: $solution})
    MERGE (u)-[:FACED]->(b)
    MERGE (b)-[:IN_FILE]->(f)
    MERGE (b)-[:FIXED_BY]->(s)
    RETURN b
    """
    run_query(q, {"user_id": user_id, "bug_desc": bug_desc, "file_name": file_name, "solution": solution, "tags": ",".join(tags)})
    return True

def search_memory(user_id: str, query: str):
    if USE_MOCK:
        results = []
        for n in MOCK_STORE["nodes"]:
            if n["user"]==user_id and (query.lower() in n["bug"].lower() or query.lower() in n["solution"].lower() or any(t in query.lower() for t in n["tags"])):
                results.append(n)
        return results
    q = """
    MATCH (u:User {id: $uid})-[:FACED]->(b:Bug)-[:FIXED_BY]->(s:Solution),
          (b)-[:IN_FILE]->(f:File)
    WHERE b.desc CONTAINS $q OR s.text CONTAINS $q
    RETURN b.desc as bug, f.name as file, s.text as solution, b.tags as tags
    ORDER BY b.created DESC LIMIT 5
    """
    return run_query(q, {"uid": user_id, "q": query})

def get_user_history(user_id: str):
    if USE_MOCK:
        return [n for n in MOCK_STORE["nodes"] if n["user"]==user_id][-10:]
    q = """
    MATCH (u:User {id: $uid})-[:FACED]->(b:Bug)-[:FIXED_BY]->(s:Solution)
    RETURN b.desc as bug, s.text as solution ORDER BY b.created DESC LIMIT 10
    """
    return run_query(q, {"uid": user_id})

def get_graph_stats():
    if USE_MOCK:
        return {"nodes": len(MOCK_STORE["nodes"]), "edges": len(MOCK_STORE["nodes"])*3, "mode": "MOCK (works without docker)"}
    try:
        res = graph.query("MATCH (n) RETURN count(n) as c")
        nodes = res.result_set[0][0] if res.result_set else 0
        res2 = graph.query("MATCH ()-[r]->() RETURN count(r) as c")
        edges = res2.result_set[0][0] if res2.result_set else 0
        return {"nodes": nodes, "edges": edges, "mode": "FalkorDB Connected"}
    except:
        return {"nodes": 0, "edges": 0, "mode": "Error"}
