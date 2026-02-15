
import sys
import os

# Ensure we can import from current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import launch_auto_quiz, submit_ai_answer

def verify_mutations():
    print("Verifying mutation tools...")
    
    # Test launch_auto_quiz with invalid session (should fail gracefully but confirm tool works)
    print("\nTesting launch_auto_quiz...")
    result = launch_auto_quiz("test_session_id")
    print(f"Result: {result}")
    
    # Test submit_ai_answer with invalid question (should fail gracefully)
    print("\nTesting submit_ai_answer...")
    result = submit_ai_answer("test_question_id", "This is an AI answer.")
    print(f"Result: {result}")

    if "Failed" in result or "Error" in result:
        print("\nMutation tool execution confirmed (handled invalid IDs gracefully)")

if __name__ == "__main__":
    verify_mutations()
