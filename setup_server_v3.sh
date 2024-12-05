#!/bin/bash

# Exit on error
set -e

echo "Starting GenAS server setup..."

# Update package list and install required packages
echo "Updating system and installing dependencies..."
sudo apt-get update
sudo apt-get install -y nginx python3-venv python3-pip supervisor

# Create application directory
echo "Setting up application directory..."
APP_DIR=/home/ubuntu/genas
sudo mkdir -p $APP_DIR
sudo chown ubuntu:ubuntu $APP_DIR

# Copy application files
echo "Copying application files..."
cp -r * $APP_DIR/

# Create and configure virtual environment
echo "Setting up Python virtual environment..."
cd $APP_DIR
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/versions
mkdir -p $APP_DIR/flask_session
chmod 755 $APP_DIR/uploads
chmod 755 $APP_DIR/versions
chmod 755 $APP_DIR/flask_session

# Set up environment file
echo "Setting up environment file..."
if [ ! -f "$APP_DIR/.env" ]; then
    cp .env.example .env
    echo "Please update the .env file with your configuration"
fi

# Create systemd service file
echo "Creating systemd service..."
sudo tee /etc/systemd/system/genas.service << 'EOF'
[Unit]
Description=GenAS Application Service
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/genas
Environment="PATH=/home/ubuntu/genas/venv/bin"
Environment="PYTHONPATH=/home/ubuntu/genas"
ExecStart=/home/ubuntu/genas/venv/bin/gunicorn \
    --workers 3 \
    --bind unix:/home/ubuntu/genas/genas.sock \
    --timeout 120 \
    --access-logfile /home/ubuntu/genas/logs/access.log \
    --error-logfile /home/ubuntu/genas/logs/error.log \
    --capture-output \
    --log-level info \
    app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Create logs directory
echo "Setting up log directories..."
mkdir -p $APP_DIR/logs
touch $APP_DIR/logs/access.log
touch $APP_DIR/logs/error.log
chmod 755 $APP_DIR/logs
chown -R ubuntu:ubuntu $APP_DIR/logs

# Configure Nginx
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/genas << 'EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain name if you have one

    access_log /var/log/nginx/genas_access.log;
    error_log /var/log/nginx/genas_error.log;

    location / {
        proxy_pass http://unix:/home/ubuntu/genas/genas.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # Upload settings
        client_max_body_size 50M;
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
    }

    location /static {
        alias /home/ubuntu/genas/static;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# Enable the Nginx site
echo "Enabling Nginx configuration..."
sudo ln -sf /etc/nginx/sites-available/genas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Start and enable services
echo "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable genas
sudo systemctl start genas
sudo systemctl restart nginx

echo "Setup complete! Please check the following:"
echo "1. Update the .env file with your configuration"
echo "2. Check logs at /home/ubuntu/genas/logs/"
echo "3. Access the application at http://your_server_ip"
echo "4. Monitor the service with: sudo systemctl status genas"
