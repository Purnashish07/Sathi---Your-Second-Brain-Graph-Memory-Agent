
from .graph_db import add_bug_memory, search_memory, get_user_history

def extract_tags(text: str):
    keywords = ["auth", "jwt", "login", "api", "database", "react", "python", "cors", "token", "payment", "bug", "error"]
    return [k for k in keywords if k in text.lower()]

def remember_interaction(user_id: str, bug_desc: str, file_name: str, solution: str):
    tags = extract_tags(bug_desc + " " + solution)
    add_bug_memory(user_id, bug_desc, file_name, solution, tags)
    return {"tags": tags}

def recall(user_id: str, query: str):
    memories = search_memory(user_id, query)
    return memories
