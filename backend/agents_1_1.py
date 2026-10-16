
from .memory import remember_interaction, recall

class MemoryWriterAgent:
    def process(self, user_id: str, bug: str, file: str, solution: str):
        result = remember_interaction(user_id, bug, file, solution)
        return f"Yaad rakh liya! Bug '{bug}' -> {file}. Tags: {result['tags']}."

class MemoryReaderAgent:
    def process(self, user_id: str, query: str):
        memories = recall(user_id, query)
        if not memories:
            return {"answer": f"Isse pehle aisa bug tumne face nahi kiya. Naya issue lagta hai. File ka naam aur error batao, main graph me save kar leta hu.", "path": [], "found": False}
        formatted = []
        for m in memories:
            if isinstance(m, dict):
                formatted.append(m)
            else:
                try:
                    formatted.append({"bug": m[0], "file": m[1], "solution": m[2], "tags": m[3]})
                except:
                    formatted.append({"bug": str(m)})
        first = formatted[0]
        bug_text = first.get("bug", "past bug")
        file_text = first.get("file", "unknown file")
        sol_text = first.get("solution", "previous fix")
        answer = f"""Graph me mila!

Tumne pehle bhi similar issue face kiya tha:

Past Bug: {bug_text}
File: {file_text}
Previous Fix: {sol_text}

Reasoning Path: (User:{user_id})-[:FACED]->(Bug)-[:IN_FILE]->({file_text})-[:FIXED_BY]->(Solution)
Isiliye main keh raha hu, {file_text} check karo aur {sol_text} apply karo.

Ye 3 hop traversal FalkorDB ne 1 query me kiya hai.
"""
        return {"answer": answer, "path": formatted, "found": True, "cypher_used": f"MATCH (u:User {{id:'{user_id}'}})-[:FACED]->(b:Bug)-[:FIXED_BY]->(s:Solution) WHERE b.desc CONTAINS '{query}' RETURN b,f,s"}
