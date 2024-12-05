#!/bin/bash

# Kill any existing Gunicorn processes
pkill -f gunicorn

# Set environment variables
export ANTHROPIC_API_KEY="your-api-key-here"

# Start Gunicorn with the environment variables
cd /home/ubuntu/genas
source venv/bin/activate
PYTHONPATH=/home/ubuntu/genas gunicorn --bind 127.0.0.1:5000 app:app --log-level debug
