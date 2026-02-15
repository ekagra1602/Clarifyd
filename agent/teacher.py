from typing import List, Optional
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field
try:
    from convex_client import client as convex_client
except ImportError:
    convex_client = None

# --- Models ---

class Question(BaseModel):
    student_id: str
    text: str
    timestamp: float

# --- Logic ---

def analyze_teaching_style(past_lectures: List[str]) -> str:
    """
    Analyzes past lecture content to determine teaching style.
    """
    print(f"[AGENT: Teacher.analyze_teaching_style] Analyzing style from {len(past_lectures) if past_lectures else 0} lecture snippets")
    # If convex_client available, we can fetch real session data if 'past_lectures' contains session IDs
    if convex_client and past_lectures and past_lectures[0].startswith("SESSION:"):
        session_id = past_lectures[0].split(":")[1]
        try:
             # Fetch confusing moments
             lost_events = convex_client.query("lostEvents:listLostEvents", {"sessionId": session_id}) or []
             questions = convex_client.query("questions:listRecentQuestions", {"sessionId": session_id}) or []
             
             if len(lost_events) > 5:
                 return f"Pacing might be too fast. {len(lost_events)} students got lost."
             if len(questions) > 10:
                 return "highly interactive session with many questions."
        except Exception as e:
            pass

    return "Socratic, encouraging, uses analogies."

def cluster_questions(questions: List[Question]) -> List[str]:
    """
    Clusters similar questions to identify common confusion points.
    """
    print(f"[AGENT: Teacher.cluster_questions] Clustering {len(questions) if questions else 0} questions")
    if not questions:
        return []

    # Placeholder for clustering
    # questions_text = [q.text for q in questions]
    # clusters = cluster_algorithm(questions_text)
    
    # Simple simulation:
    common_themes = ["Understanding recursion", "API rate limits"]
    return [f"{len(questions)} students asked about {theme}" for theme in common_themes]
