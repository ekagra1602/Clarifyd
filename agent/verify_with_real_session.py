
import sys
import os
import time

# Ensure we can import from current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from convex_client import client
    from server import generate_teacher_insights, launch_auto_quiz
except ImportError:
    print("Error imports failed. Ensure agent/convex_client.py, agent/server.py exist.")
    sys.exit(1)

def verify_with_session(session_id: str):
    print(f"Verifying with session ID: {session_id}")
    
    # 1. Test generate_teacher_insights
    print("\n--- Testing Teacher Insights ---")
    try:
        # Use the special protocol string
        result = generate_teacher_insights([f"FETCH_FROM_CONVEX:{session_id}"])
        print(f"Result: {result}")
    except Exception as e:
        print(f"Failed: {e}")

    # 2. Test launch_auto_quiz
    print("\n--- Testing Quiz Launch ---")
    try:
        result = launch_auto_quiz(session_id, topic="test", difficulty="easy")
        print(f"Result: {result}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_with_real_session.py <session_id>")
        sys.exit(1)
    
    verify_with_session(sys.argv[1])
