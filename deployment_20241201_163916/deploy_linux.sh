#!/bin/bash

# Linux Deployment Script for GenAS
set -e

# Default values
INSTALL_PATH="/opt/genas"
PORT=5000
INSTALL_AS_SERVICE=false
API_KEY=""
USER=$(whoami)

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a deploy_log.txt
}

# Function to show usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -p, --path PATH         Installation path (default: /opt/genas)"
    echo "  -k, --api-key KEY       Anthropic API key"
    echo "  --port PORT             Port to run the application (default: 5000)"
    echo "  -s, --service           Install as systemd service"
    echo "  -u, --user USER         User to run the service as (default: current user)"
    echo "  -h, --help              Show this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--path)
            INSTALL_PATH="$2"
            shift 2
            ;;
        -k|--api-key)
            API_KEY="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        -s|--service)
            INSTALL_AS_SERVICE=true
            shift
            ;;
        -u|--user)
            USER="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Check if running as root when installing as service
if [ "$INSTALL_AS_SERVICE" = true ] && [ "$EUID" -ne 0 ]; then
    log "Error: Root privileges required to install as service"
    exit 1
fi

try {
    # Create installation directory
    log "Creating installation directory: $INSTALL_PATH"
    sudo mkdir -p "$INSTALL_PATH"
    sudo chown "$USER:$USER" "$INSTALL_PATH"

    # Find and extract deployment package
    DEPLOY_PACKAGE=$(ls -t deployment_*.zip | head -n1)
    if [ -z "$DEPLOY_PACKAGE" ]; then
        log "Error: Deployment package not found"
        exit 1
    }

    log "Extracting deployment package: $DEPLOY_PACKAGE"
    unzip -o "$DEPLOY_PACKAGE" -d "$INSTALL_PATH"

    # Set up virtual environment
    log "Creating virtual environment"
    cd "$INSTALL_PATH"
    python3 -m venv venv

    # Activate virtual environment and install dependencies
    log "Installing dependencies"
    source venv/bin/activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn

    # Create .env file
    if [ -n "$API_KEY" ]; then
        log "Creating .env file"
        echo "ANTHROPIC_API_KEY=$API_KEY" > "$INSTALL_PATH/.env"
    else
        log "Warning: No API key provided. Please set it manually in .env file"
        cp "$INSTALL_PATH/.env.example" "$INSTALL_PATH/.env"
    fi

    # Create startup script
    cat > "$INSTALL_PATH/start.sh" << EOL
#!/bin/bash
source "$INSTALL_PATH/venv/bin/activate"
gunicorn -w 4 -b 0.0.0.0:$PORT app:app
EOL
    chmod +x "$INSTALL_PATH/start.sh"

    if [ "$INSTALL_AS_SERVICE" = true ]; then
        log "Installing as systemd service"
        
        # Create systemd service file
        cat > /etc/systemd/system/genas.service << EOL
[Unit]
Description=GenAS Document AI
After=network.target

[Service]
User=$USER
WorkingDirectory=$INSTALL_PATH
Environment="PATH=$INSTALL_PATH/venv/bin"
ExecStart=$INSTALL_PATH/venv/bin/gunicorn -w 4 -b 0.0.0.0:$PORT app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOL

        # Set up systemd service
        log "Setting up systemd service"
        systemctl daemon-reload
        systemctl enable genas
        systemctl start genas
    fi

    # Create Nginx configuration if installing as service
    if [ "$INSTALL_AS_SERVICE" = true ]; then
        log "Creating Nginx configuration"
        cat > /etc/nginx/sites-available/genas << EOL
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOL
        ln -sf /etc/nginx/sites-available/genas /etc/nginx/sites-enabled/
        systemctl reload nginx
    fi

    # Create uninstall script
    cat > "$INSTALL_PATH/uninstall.sh" << EOL
#!/bin/bash
echo "Stopping GenAS service..."
sudo systemctl stop genas
echo "Removing GenAS service..."
sudo systemctl disable genas
sudo rm /etc/systemd/system/genas.service
sudo systemctl daemon-reload
echo "Removing Nginx configuration..."
sudo rm /etc/nginx/sites-enabled/genas
sudo rm /etc/nginx/sites-available/genas
sudo systemctl reload nginx
echo "Removing installation directory..."
sudo rm -rf "$INSTALL_PATH"
echo "Uninstallation complete."
EOL
    chmod +x "$INSTALL_PATH/uninstall.sh"

    # Set proper permissions
    log "Setting file permissions"
    chmod 600 "$INSTALL_PATH/.env"
    chmod 755 "$INSTALL_PATH/app.py"
    chmod -R 755 "$INSTALL_PATH/static" "$INSTALL_PATH/templates"
    chmod -R 777 "$INSTALL_PATH/uploads" "$INSTALL_PATH/versions"

    log "Installation completed successfully!"
    log "Installation path: $INSTALL_PATH"
    if [ "$INSTALL_AS_SERVICE" = true ]; then
        log "Service name: genas"
        log "Service status: $(systemctl is-active genas)"
    fi
    log "Port: $PORT"

    # Print next steps
    log "
Next steps:"
    if [ "$INSTALL_AS_SERVICE" = false ]; then
        log "1. Run './start.sh' to start the application"
    fi
    if [ -z "$API_KEY" ]; then
        log "1. Edit '$INSTALL_PATH/.env' and add your Anthropic API key"
    fi
    log "2. Access the application at http://localhost:$PORT"
    log "3. To uninstall, run './uninstall.sh' as root"

} catch {
    log "Error during deployment: $?"
    exit 1
}
