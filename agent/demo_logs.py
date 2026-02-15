
import sys
import os

# Add current directory to path so we can import agent modules
# Assuming run from root of repo
sys.path.append(os.getcwd())

try:
    from agent.server import (
        process_transcript_for_student,
        anonymize_question,
        generate_teacher_insights,
        check_library_for_answer,
        launch_auto_quiz,
        submit_ai_answer,
        StudentProfile,
        TranscriptChunk
    )
    # student.py imports process_chunk
    from agent.student import process_chunk
    # teacher.py imports analyze_teaching_style, cluster_questions, Question
    from agent.teacher import analyze_teaching_style, cluster_questions, Question
    # library.py imports add_document, check_if_asked_before
    # library.py imports add_document, check_if_asked_before
    from agent.library import add_document, check_if_asked_before
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Ensure you are running this script from the project root (e.g., 'python agent/demo_logs.py')")
    sys.exit(1)

def demo_server_logs():
    print("\n=== DEMO: SERVER TOOL LOGS (agent/server.py) ===")
    
    # 1. process_transcript_for_student
    print("\n--- Calling process_transcript_for_student ---")
    profile = StudentProfile(student_id="demo_student", language="es", disability="auditory")
    chunk = TranscriptChunk(text="Hello world", timestamp=123.45)
    try:
        # Note: If wrapped by FastMCP, calling directly might invoke wrapper logic or just function
        process_transcript_for_student(profile, chunk)
    except Exception as e:
        print(f"Result: (Execution finished with possible error: {e})")

    # 2. anonymize_question
    print("\n--- Calling anonymize_question ---")
    try:
        anonymize_question("student_123", "My name is student_123 and I have a question.")
    except Exception as e:
        print(f"Result: (Execution finished with possible error: {e})")

    # 3. generate_teacher_insights
    print("\n--- Calling generate_teacher_insights ---")
    try:
        generate_teacher_insights(["How do I do X?", "What is Y?"])
    except Exception as e:
        print(f"Result: (Execution finished with possible error: {e})")
        
    # 4. check_library_for_answer
    print("\n--- Calling check_library_for_answer ---")
    try:
        check_library_for_answer("What is the capital of Mars?")
    except Exception as e:
        print(f"Result: (Execution finished with possible error: {e})")

    # 5. launch_auto_quiz
    print("\n--- Calling launch_auto_quiz ---")
    try:
        launch_auto_quiz("session_abc", "science", "hard")
    except Exception as e:
        print(f"Result: (Execution finished with possible error: {e})")

    # 6. submit_ai_answer
    print("\n--- Calling submit_ai_answer ---")
    try:
        submit_ai_answer("q_123", "The answer is 42.")
    except Exception as e:
        print(f"Result: (Execution finished with possible error: {e})")

def demo_internal_logs():
    print("\n=== DEMO: INTERNAL AGENT LOGS ===")
    
    # 1. Student Agent
    print("\n--- Student Agent (agent/student.py) ---")
    try:
        profile = StudentProfile(student_id="s1", language="fr", disability=None)
        chunk = TranscriptChunk(text="Bonjour", timestamp=0.0)
        # Calling internal processing function directly
        process_chunk(profile, chunk)
    except Exception as e:
        print(f"Error: {e}")

    # 2. Teacher Agent
    print("\n--- Teacher Agent (agent/teacher.py) ---")
    try:
        analyze_teaching_style(["Lecture content..."])
        # Need correct Question object construction if imported from server or distinct file
        # agent/teacher.py imports Question from server.py (or defines it? It defines it!)
        # Wait, server.py defines Question too? No, server.py imports Question?
        # server.py defines `StudentProfile`, `TranscriptChunk`.
        # teacher.py defines `Question`.
        # I imported Question from server.py in the try-except block above? 
        # Actually server.py does NOT define Question. teacher.py does.
        # So I should use the imported Question or define a mock one.
        # Let's use a simple mock or dict if pydantic allows, but better use the class.
        # I don't have access to Question class easily if import fails, but let's assume valid import.
        # teacher.py: class Question(BaseModel): student_id: str, text: str, timestamp: float
        from agent.teacher import Question as TeacherQuestion
        q1 = TeacherQuestion(student_id="s1", text="Q1", timestamp=0.0)
        q2 = TeacherQuestion(student_id="s2", text="Q2", timestamp=0.0)
        cluster_questions([q1, q2])
    except Exception as e:
        print(f"Error: {e}")

    # 3. Library Agent
    print("\n--- Library Agent (agent/library.py) ---")
    try:
        add_document("doc_demo", "Content", {})
        check_if_asked_before("Query")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Starting Log Demo...")
    demo_internal_logs()
    demo_server_logs()
    print("\n=== DEMO COMPLETE ===")
