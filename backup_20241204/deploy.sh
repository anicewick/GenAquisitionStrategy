#!/bin/bash

# Update system and install dependencies
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv nginx

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Copy systemd service file
sudo cp genas.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable genas
sudo systemctl restart genas

# Configure Nginx
sudo cp genas_nginx.conf /etc/nginx/sites-available/genas
sudo ln -sf /etc/nginx/sites-available/genas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site
sudo systemctl restart nginx

# Check service status
echo "Checking service status..."
sudo systemctl status genas
sudo systemctl status nginx
