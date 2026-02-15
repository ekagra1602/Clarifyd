
import os
import time
import sys
from typing import List, Optional
from dotenv import load_dotenv
from anthropic import Anthropic

# Add current directory to path so we can import agent modules
sys.path.append(os.getcwd())

# Add current directory and agent directory to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "agent"))

# Import Convex Client wrapper
try:
    # Try importing directly (if agent/ in path) or via package
    try:
        from convex_client import client as convex_client
    except ImportError:
        from agent.convex_client import client as convex_client
except ImportError:
    print("Error: Could not import convex_client.")
    sys.exit(1)

# Import Teacher Agent logic
try:
    try:
        from teacher import analyze_teaching_style
    except ImportError:
        from agent.teacher import analyze_teaching_style
except ImportError:
    print("Warning: Could not import teacher agent logic. Using default behavior.")
    def analyze_teaching_style(lectures): return "Supportive and clear."

# Load env vars
# Load .env.local first (if exists) to override .env defaults
load_dotenv(".env.local")
load_dotenv()

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
if not CLAUDE_API_KEY:
    print("Error: CLAUDE_API_KEY not found in environment variables.")
    # For prototype, we might exit or warn.
    # sys.exit(1)

anthropic = Anthropic(api_key=CLAUDE_API_KEY)

def get_teacher_style(session_id: str) -> str:
    """
    Fetches context from Convex and analyzes teaching style.
    """
    try:
        # Fetch session context (transcript, slides, etc.)
        # Using the query we saw in other files: api.sessions.getSessionContext
        # We need to map it to string for convex_client.query
        context_data = convex_client.query("sessions:getSessionContext", {"sessionId": session_id})
        
        if not context_data:
            return "Supportive and helpful."

        transcript = context_data.get("transcript", "")
        uploaded_context = context_data.get("uploadedContext", "")
        
        # Combine for analysis
        combined_text = f"{uploaded_context}\n{transcript}"
        
        # Use Teacher Agent logic
        style = analyze_teaching_style([combined_text[:5000]]) # Limit context for style analysis
        return style
    except Exception as e:
        print(f"Error fetching teacher style: {e}")
        return "Supportive and helpful."

def generate_answer(question: str, style: str, context: str) -> str:
    """
    Generates an answer using Claude, incorporating teacher style and context.
    """
    system_prompt = f"""You are a helpful teaching assistant.
Your teaching style is: {style}

Answer the student's question based on the provided context.
If the answer is not in the context, use your general knowledge but mention that it wasn't explicitly covered yet.
Keep answers concise and encouraging.
"""
    
    user_prompt = f"""Context:
{context}

Student Question: {question}
"""

    # List of models to try in order of preference
    models = [
        "claude-3-5-sonnet-20241022", # Newest Sonnet
        "claude-3-5-sonnet-20240620", # Older Sonnet 3.5
        "claude-3-sonnet-20240229",   # Claude 3 Sonnet
        "claude-3-opus-20240229",     # Claude 3 Opus
        "claude-3-haiku-20240307",    # Claude 3 Haiku
        "claude-3-5-sonnet-latest"    # Alias (tried last as it failed before)
    ]

    last_error = None

    for model in models:
        try:
            print(f"Trying model: {model}...")
            message = anthropic.messages.create(
                model=model,
                max_tokens=1024,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            print(f"Success with model: {model}")
            return message.content[0].text
        except Exception as e:
            print(f"Failed with {model}: {e}")
            last_error = e

            # If it's not a 404 (model found) or 400 (bad request), but something like 401 (auth), stop trying
            if "authentication_error" in str(e) or "permission_error" in str(e):
                break
    
    # If we get here, all failed
    import traceback
    traceback.print_exc()
    return f"Agent Error: All models failed. Last error: {str(last_error)}"

def process_pending_questions():
    """
    Main loop to process pending questions.
    """
    # Log API key status once
    if not hasattr(process_pending_questions, "logged_key"):
        masked_key = CLAUDE_API_KEY[:10] + "..." if CLAUDE_API_KEY else "None"
        print(f"--- Agent Initialized ---")
        print(f"Using CLAUDE_API_KEY: {masked_key}")
        process_pending_questions.logged_key = True

    print("--- Checking for pending questions... ---")
    try:
        # Fetch pending questions (limit to 10 to avoid overload)
        # We added `listPendingQuestions` to `questions.ts` which takes optional limit
        questions = convex_client.query("questions:listPendingQuestions", {"limit": 10})
        
        if not questions:
            pass # No questions pending
            return

        print(f"Found {len(questions)} pending questions.")

        for q in questions:
            question_id = q["_id"]
            question_text = q["question"]
            session_id = q["sessionId"]
            student_id = q["studentId"]
            
            print(f"Processing question {question_id} from student {student_id}: {question_text}")

            # 1. Get Context & Style
            style = get_teacher_style(session_id)
            
            # Fetch context again (or pass it from get_teacher_style if we refactor)
            # For simplicity, fetching generic context again
            context_data = convex_client.query("sessions:getSessionContext", {"sessionId": session_id})
            transcript = context_data.get("transcript", "") if context_data else ""
            uploaded_context = context_data.get("uploadedContext", "") if context_data else ""
            full_context = f"{uploaded_context}\n\nTranscript:\n{transcript}"

            # 2. Generate Answer
            answer = generate_answer(question_text, style, full_context)
            
            # 3. Submit Answer
            print(f"Submitting answer: {answer[:50]}...")
            convex_client.mutation("questions:saveAnswer", {
                "questionId": question_id,
                "answer": answer
            })
            print(f"✅ Answer submitted for {question_id}")

    except Exception as e:
        print(f"Error in process loop: {e}")

if __name__ == "__main__":
    print("Starting Python Agent for Q&A...")
    print("Press Ctrl+C to stop.")
    
    while True:
        process_pending_questions()
        time.sleep(2) # Poll every 2 seconds
