# Configuration
$INSTANCE_IP = "54.83.117.12"
$KEY_PATH = "genas-key-pair-1733087599.pem"  # Updated key path
$APP_NAME = "genas"
$REMOTE_USER = "ubuntu"
$REMOTE_DIR = "/home/ubuntu/genas"

Write-Host "Starting deployment to $INSTANCE_IP..."

# Create a temporary deployment directory
$DEPLOY_DIR = "deployment_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $DEPLOY_DIR | Out-Null

# Copy necessary files to deployment directory
Write-Host "Preparing deployment files..."
Copy-Item -Path "app.py", "requirements.txt", "setup_server_v3.sh", "genas.service", "genas_nginx.conf", ".env.example" -Destination $DEPLOY_DIR
Copy-Item -Path "static" -Destination $DEPLOY_DIR -Recurse -Force
Copy-Item -Path "templates" -Destination $DEPLOY_DIR -Recurse -Force

# Create necessary directories
New-Item -ItemType Directory -Path "$DEPLOY_DIR/uploads" -Force | Out-Null
New-Item -ItemType Directory -Path "$DEPLOY_DIR/versions" -Force | Out-Null
New-Item -ItemType Directory -Path "$DEPLOY_DIR/flask_session" -Force | Out-Null

# Ensure all files are closed
Start-Sleep -Seconds 2

# Create deployment archive
Write-Host "Creating deployment archive..."
$compress = @{
    Path = "$DEPLOY_DIR\*"
    CompressionLevel = "Fastest"
    DestinationPath = "$DEPLOY_DIR.zip"
}
Compress-Archive @compress -Force

# Use SSH to create directory and set permissions
Write-Host "Setting up remote directory..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no "${REMOTE_USER}@${INSTANCE_IP}" "sudo mkdir -p $REMOTE_DIR && sudo chown ubuntu:ubuntu $REMOTE_DIR"

# Copy files to server
Write-Host "Copying files to server..."
scp -i $KEY_PATH -o StrictHostKeyChecking=no "$DEPLOY_DIR.zip" "${REMOTE_USER}@${INSTANCE_IP}:/home/${REMOTE_USER}/"

# Execute deployment commands
Write-Host "Executing deployment commands..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no "${REMOTE_USER}@${INSTANCE_IP}" @"
    cd /home/ubuntu
    unzip -o $DEPLOY_DIR.zip -d genas/
    rm $DEPLOY_DIR.zip
    cd genas
    chmod +x setup_server_v3.sh
    ./setup_server_v3.sh
    sudo systemctl restart nginx
    echo 'Deployment completed!'
"@

# Clean up local deployment files
Write-Host "Cleaning up local deployment files..."
Remove-Item -Path $DEPLOY_DIR -Recurse -Force
Remove-Item -Path "$DEPLOY_DIR.zip" -Force

Write-Host "Deployment script completed!"
Write-Host "You can access the application at http://$INSTANCE_IP"
Write-Host "To check the application status, connect to the server and run: sudo systemctl status genas"
