#!/bin/bash

# Update package list and install required packages
sudo apt-get update
sudo apt-get install -y nginx python3-venv python3-pip

# Create and configure virtual environment
cd /home/ubuntu/genas
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create systemd service file
sudo tee /etc/systemd/system/genas.service << 'EOF'
[Unit]
Description=GenAS Application Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/genas
Environment="PATH=/home/ubuntu/genas/venv/bin"
ExecStart=/home/ubuntu/genas/venv/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
sudo tee /etc/nginx/sites-available/genas << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable the Nginx site
sudo ln -sf /etc/nginx/sites-available/genas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Start and enable services
sudo systemctl daemon-reload
sudo systemctl enable genas
sudo systemctl start genas
sudo systemctl restart nginx

# Show status
systemctl status genas
systemctl status nginx
