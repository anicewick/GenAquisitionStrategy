#!/bin/bash

# Configuration
INSTANCE_IP="54.83.117.12"
KEY_PATH="GenAS-KeyPair.pem"
APP_NAME="genas"
REMOTE_USER="ubuntu"
REMOTE_DIR="/home/ubuntu/genas"

echo "Starting deployment to $INSTANCE_IP..."

# Ensure key file has correct permissions
chmod 400 $KEY_PATH

# Create a temporary deployment directory
DEPLOY_DIR="deployment_$(date +%Y%m%d_%H%M%S)"
mkdir -p $DEPLOY_DIR

# Copy necessary files to deployment directory
echo "Preparing deployment files..."
cp -r app.py requirements.txt static templates .env.example $DEPLOY_DIR/
cp setup_server_v3.sh $DEPLOY_DIR/setup.sh
cp genas.service $DEPLOY_DIR/
cp genas_nginx.conf $DEPLOY_DIR/

# Create necessary directories
mkdir -p $DEPLOY_DIR/uploads
mkdir -p $DEPLOY_DIR/versions
mkdir -p $DEPLOY_DIR/flask_session

# Create deployment archive
echo "Creating deployment archive..."
cd $DEPLOY_DIR
zip -r ../$DEPLOY_DIR.zip .
cd ..

# Copy files to server
echo "Copying files to server..."
scp -i $KEY_PATH -o StrictHostKeyChecking=no $DEPLOY_DIR.zip $REMOTE_USER@$INSTANCE_IP:/home/$REMOTE_USER/

# Execute deployment commands
echo "Executing deployment commands..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no $REMOTE_USER@$INSTANCE_IP << 'ENDSSH'
    # Create application directory
    sudo mkdir -p /home/ubuntu/genas
    sudo chown ubuntu:ubuntu /home/ubuntu/genas

    # Unzip deployment package
    cd /home/ubuntu
    unzip -o deployment_*.zip -d genas/
    rm deployment_*.zip

    # Make setup script executable
    chmod +x genas/setup.sh

    # Run setup script
    cd genas
    ./setup.sh

    # Clean up
    sudo systemctl restart nginx
    echo "Deployment completed!"
ENDSSH

# Clean up local deployment files
echo "Cleaning up local deployment files..."
rm -rf $DEPLOY_DIR
rm -f $DEPLOY_DIR.zip

echo "Deployment script completed!"
echo "You can access the application at http://$INSTANCE_IP"
echo "To check the application status, run: ssh -i $KEY_PATH $REMOTE_USER@$INSTANCE_IP 'sudo systemctl status genas'"
