#!/bin/bash

# Function to kill all background processes on exit
cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up trap to call cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

echo "Starting TreeHacks Education Platform..."

# 1. Start Convex (Backend)
echo "→ Starting Convex..."
npx convex dev &

# 2. Start Python Agent (Q&A Service)
echo "→ Starting Python Agent..."
# Ensure dependencies are installed first if needed
# pip install -r agent/requirements.txt
python agent/process_question.py &

# 3. Start Frontend (Vite)
echo "→ Starting Frontend..."
npm run dev:frontend &

# Wait for all background processes
wait
