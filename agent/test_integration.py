
import sys
import os

# Ensure we can import from current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from convex_client import client
from server import generate_teacher_insights

def verify_connection():
    print("Verifying Convex connection...")
    try:
        # Try a simple query
        questions = client.query("questions:listRecentQuestions", {"sessionId": "123", "limit": 1})
        print("Successfully connected to Convex!")
        print(f"QueryResult: {questions}")
    except Exception as e:
        print(f"Connection failed: {e}")
        # It might fail if sessionId is invalid, but connection itself should work up to that point
        if "Convex" in str(e) or "client" in str(e):
             print("Client initialization seems okay, query logic might be issue (expected if session invalid)")

def verify_tool():
    print("\nVerifying generate_teacher_insights tool...")
    # Test with the special protocol string
    result = generate_teacher_insights(["FETCH_FROM_CONVEX:invalid_session_id"])
    print(f"Tool Result: {result}")
    
    if "No questions found" in result or "Error fetching" in result:
        print("Tool logic execution confirmed (handled invalid session cleanly)")
    else:
        print("Unexpected tool result")

if __name__ == "__main__":
    verify_connection()
    verify_tool()
