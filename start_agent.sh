
#!/bin/bash

# Ensure dependencies are installed
echo "Installing/Checking Python dependencies..."
pip install -r agent/requirements.txt

# Start the Python Agent
echo "Starting Python Agent for Q&A..."
python agent/process_question.py
