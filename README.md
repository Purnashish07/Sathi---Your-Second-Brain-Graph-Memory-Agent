Sathi - Graph Memory Agent 🧠🕸️

Track 02: Memory & Coordination + Track 01: Explainable & Interactive | FalkorDB Hackathon

Your Second Brain that never forgets. A multi-agent system where 3 agents share the same FalkorDB graph to remember bugs across sessions, explain their reasoning, and prevent team-wide repetition.

Video: https://youtu.be/W8bz6LKrlqQ | Run: Works without Docker (MOCK fallback)

Quick Run
Without Docker (2 commands - for judges):

cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
cd frontend && npm install && npm run dev
Open http://localhost:5173 → Seed Demo Data → Ask "mera auth wala bug yaad hai?" → Graph Canvas → Detective

With Docker:

docker run -p 6379:6379 -p 3000:3000 falkordb/falkordb:edge
# then same backend/frontend commands

Graph Model
(User {id})-[:FACED {timestamp}]->(Bug {desc, tags, created})-[:IN_FILE]->(File {name})-[:FIXED_BY]->(Solution {text})
(Bug)-[:BELONGS_TO]->(Concept {name})
(Commit)-[:FIXES]->(Bug) [Company Brain]

Cypher Queries (Core Logic)
// 1. Recall (multi-hop)
MATCH (u:User {id:$uid})-[:FACED]->(b:Bug)-[:FIXED_BY]->(s:Solution),(b)-[:IN_FILE]->(f:File)
WHERE toLower(b.desc) CONTAINS toLower($q) RETURN b,f,s ORDER BY b.created DESC LIMIT 5
// 2. Buggy File - PageRank-like (Detective Agent)
MATCH (f:File)<-[:IN_FILE]-(b:Bug) RETURN f.name, count(b) AS c ORDER BY c DESC LIMIT 10
// 3. Full Graph Viz
MATCH (u {id:$uid})-[:FACED]->(b)-[:IN_FILE]->(f),(b)-[:FIXED_BY]->(s) RETURN b,f,s LIMIT 20
// 4. Concept Map
MATCH (u {id:$uid})-[:FACED]->(b:Bug) UNWIND split(b.tags,",") AS t RETURN t, count(*) ORDER BY count DESC
// 5. Company Brain
MATCH (c:Commit)-[:FIXES]->(b:Bug)-[:IN_FILE]->(f:File) RETURN f.name, count(b) ORDER BY count DESC

Algorithms: Degree Centrality, Concept co-occurrence, Temporal sorting

Demo Flow (Video 0:00-0:30)
0s Seed → 22 nodes, 33 edges | 3s Ask "mera auth wala bug yaad hai?" → JWT fix + Cypher + Path (User)-[:FACED]->(Bug)-[:IN_FILE]->(auth.js) | 9s Graph Canvas → Live force graph Red=Bug Yellow=File Green=Solution | 17s Detective → auth.js 33.3% risk, multi-hop, concept patterns

Tracks
Track 02 Primary: Follow connections Bug->File->Solution, Remember across sessions (dev123 persists), Share state (Writer/Reader/Detective same graph SathiMemory), Company Brain (/github/import + multi-tenant)

Track 01 Bonus: Explainable panel shows Cypher + path + timeline

API
POST /ask {user_id, query} | POST /remember {user_id,bug,file,solution} | GET /graph/{user_id} | GET /analyze/{user_id} | POST /github/import

Why FalkorDB?
Vector = similarity only. FalkorDB = connections: auth bug → auth.js → payment bug via same middleware. One Cypher hop. Rust+Redis = fast agent tool.

Progress
Backend[x] Frontend 3 tabs[x] Graph Model[x] 5 Cypher[x] Video[x] MOCK fallback[x] | Live Deploy in progress (local 100% works)
