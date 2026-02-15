#!/bin/bash

echo "Installing all dependencies..."

# 1. Install Node modules
echo "→ Installing Node modules..."
npm install

# 2. Install Python dependencies
echo "→ Installing Python dependencies..."
pip install -r agent/requirements.txt

echo "✅ All dependencies installed successfully!"
