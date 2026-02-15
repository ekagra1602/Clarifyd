import os
import time
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")
load_dotenv()

try:
    from convex_client import client as convex_client
except ImportError:
    print("Error: Could not import convex_client. Make sure you are in the root directory.")
    exit(1)

def verify_context_aware_chat():
    print("--- Verifying Context-Aware Chat ---")

    if not convex_client:
        print("Convex client not connected.")
        return

    # 1. Create a session
    print("Creating session...")
    session_data = convex_client.mutation("sessions:createSession", {"roomName": "Context Test Class"})
    session_id = session_data["sessionId"]
    print(f"Session created: {session_id}")

    # 2. Upload context
    secret_word = "BANANAS"
    context_text = f"IMPORTANT: The secret word for today's class is {secret_word}. If asked about the secret, reveal it."
    print("Uploading context...")
    # direct mutation to update contextText since uploadSlides might need storage ID nonsense
    # The schema has contextText, let's try patching it directly via internal mutation or just use uploadSlides if valid
    # backend `sessions.ts` has `uploadSlides` which takes `slidesText`.
    convex_client.mutation("sessions:uploadSlides", {"sessionId": session_id, "slidesText": context_text})
    print("Context uploaded.")

    # 3. Ask a question
    print("Asking question...")
    question_text = "What is the secret word?"
    # askQuestion returns { questionId }
    result = convex_client.mutation("questions:askQuestion", {
        "sessionId": session_id,
        "studentId": "test-student-123",
        "question": question_text
    })
    question_id = result["questionId"]
    print(f"Question asked: {question_id}")

    # 4. Wait for AI answer
    print("Waiting for AI answer...")
    for i in range(20):
        question = convex_client.query("questions:getQuestion", {"questionId": question_id})
        if question and question.get("answer"):
            answer = question["answer"]
            print(f"Received answer: {answer}")
            
            if secret_word in answer:
                print("SUCCESS: AI used the context correctly!")
                return
            else:
                print("FAILURE: AI did not mention the secret word.")
                print(f"Expected: {secret_word}")
                print(f"Got: {answer}")
                return # Fail
        
        time.sleep(2)
        print(".", end="", flush=True)

    print("\nTimeout waiting for answer.")

if __name__ == "__main__":
    verify_context_aware_chat()
