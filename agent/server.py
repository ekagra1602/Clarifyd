import os
from typing import List, Optional
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastMCP server
mcp = FastMCP("TreeHacks Education Agent")

# Initialize Convex Client
try:
    from convex_client import client as convex_client
except ImportError:
    convex_client = None
    print("Warning: Could not import convex_client. Ensure agent/convex_client.py exists.")

# --- Models ---

class StudentProfile(BaseModel):
    student_id: str
    language: str = Field(description="ISO 639-1 language code (e.g., 'en', 'es')")
    disability: Optional[str] = Field(description="Type of disability, e.g., 'auditory', 'visual', or None")

class TranscriptChunk(BaseModel):
    text: str
    timestamp: float

# --- Tools ---

@mcp.tool()
def process_transcript_for_student(profile: StudentProfile, chunk: TranscriptChunk) -> str:
    """
    Processes a transcript chunk for a specific student based on their profile.
    Handles translation and simplification.
    """
    processed_text = chunk.text
    
    # Placeholder for LangGraph logic
    # In a real implementation, this would invoke the student agent graph
    
    if profile.language != 'en':
        processed_text = f"[Translated to {profile.language}] {processed_text}"
        
    if profile.disability == 'auditory':
        processed_text = f"[Simplified] {processed_text}"
        
    return processed_text

@mcp.tool()
def anonymize_question(student_id: str, question: str) -> str:
    """
    Anonymizes a student's question before sending it to the database.
    """
    # Simple PII removal (placeholder)
    # In production, use an LLM or specialized library (Presidio)
    return question.replace(student_id, "STUDENT")

@mcp.tool()
def generate_teacher_insights(recent_questions: List[str]) -> str:
    """
    Analyzes recent student questions to generate insights for the teacher.
    Clusters similar questions.
    """
    if not recent_questions:
        return "No recent questions to analyze."
        
    # In a real scenario, we'd fetch from Convex if not provided, 
    # but here we process the list provided by the tool call (which might come from the frontend or another tool).
    # If the list is empty/placeholder strings, we can try to fetch from Convex.
    
    if len(recent_questions) == 1 and recent_questions[0].startswith("FETCH_FROM_CONVEX:"):
        # Protocol: If the argument is a specific string, fetch from DB
        session_id = recent_questions[0].split(":")[1]
        try:
            # Assuming we have a query `api.questions.listRecentQuestions`
            # We need to map this to the actual Convex query
            questions_data = convex_client.query("questions:listRecentQuestions", {"sessionId": session_id, "limit": 10})
            real_questions = [q["question"] for q in questions_data]
            if not real_questions:
                 return f"No questions found in session {session_id}."
            
            # Simple clustering simulation
            return f"Analyzed {len(real_questions)} questions from session {session_id}. Common theme: {real_questions[0]}..."
        except Exception as e:
            return f"Error fetching questions: {str(e)}"

    return f"Cluster: {len(recent_questions)} questions provided. Topics appear varied."

@mcp.tool()
def check_library_for_answer(question: str) -> Optional[str]:
    """
    Checks the central library (Vector DB) if a similar question has been asked before.
    """
    # Placeholder for RAG logic
    return None

@mcp.tool()
def launch_auto_quiz(session_id: str, topic: str = "general", difficulty: str = "medium") -> str:
    """
    Launches an AI-generated quiz for the session.
    """
    if not convex_client:
        return "Error: Convex client not connected."
        
    try:
        # Map generic difficulty to specific literal if needed, or rely on type checking
        # api.quizzes.generateAndLaunchQuiz takes { sessionId, questionCount, difficulty }
        
        # We need to pass the ID as a string, Convex client handles serialization usually, 
        # but pure string might need to be wrapped if strictly typed on client side? 
        # The python client usually handles "string" -> ID coercion for arguments.
        
        result = convex_client.mutation("quizzes:generateAndLaunchQuiz", {
            "sessionId": session_id,
            "difficulty": difficulty if difficulty in ["easy", "medium", "hard"] else "medium"
        })
        return f"Quiz launched successfully! scheduled={result.get('scheduled')}"
    except Exception as e:
        return f"Failed to launch quiz: {str(e)}"

@mcp.tool()
def submit_ai_answer(question_id: str, answer: str) -> str:
    """
    Submits an AI-generated answer to a specific question.
    """
    if not convex_client:
         return "Error: Convex client not connected."

    try:
        convex_client.mutation("questions:saveAnswer", {
            "questionId": question_id,
            "answer": answer
        })
        return "Answer submitted successfully."
    except Exception as e:
        return f"Failed to submit answer: {str(e)}"

if __name__ == "__main__":
    mcp.run()
