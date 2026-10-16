
from memory import remember_interaction, recall

class MemoryWriterAgent:
    def process(self, user_id: str, bug: str, file: str, solution: str):
        result = remember_interaction(user_id, bug, file, solution)
        return f"Yaad rakh liya! Bug '{bug}' -> {file}. Tags: {result['tags']}."

class MemoryReaderAgent:
    def process(self, user_id: str, query: str):
        memories = recall(user_id, query)
        if not memories:
            return {"answer": f"Isse pehle aisa bug tumne face nahi kiya. Naya issue lagta hai.", "path": [], "found": False}
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

Past Bug: {bug_text}
File: {file_text}
Previous Fix: {sol_text}

Reasoning Path: (User:{user_id})-[:FACED]->(Bug)-[:IN_FILE]->({file_text})-[:FIXED_BY]->(Solution)
"""
        return {"answer": answer, "path": formatted, "found": True, "cypher_used": f"MATCH (u:User {{id:'{user_id}'}})-[:FACED]->(b:Bug) WHERE b.desc CONTAINS '{query}' RETURN b"}
