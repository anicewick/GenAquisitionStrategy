import boto3
import time

def get_user_data_script():
    return '''#!/bin/bash
# Update system and install dependencies
dnf update -y
dnf install -y python3.11 python3.11-pip git nginx
systemctl start nginx
systemctl enable nginx

# Clone the repository
cd /home/ec2-user
rm -rf GenAquisitionStrategy
git clone https://github.com/anicewick/GenAquisitionStrategy.git
cd GenAquisitionStrategy

# Set up Python environment
python3.11 -m pip install -r requirements.txt

# Set up systemd service
cat > /etc/systemd/system/genas.service << 'EOL'
[Unit]
Description=GenAS Gunicorn Application
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user/GenAquisitionStrategy
Environment="PATH=/usr/local/bin"
ExecStart=/usr/local/bin/gunicorn --workers 3 --bind unix:genas.sock -m 007 app:app

[Install]
WantedBy=multi-user.target
EOL

# Configure Nginx
cat > /etc/nginx/conf.d/genas.conf << 'EOL'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://unix:/home/ec2-user/GenAquisitionStrategy/genas.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOL

# Restart services
systemctl daemon-reload
systemctl restart genas
systemctl enable genas
systemctl restart nginx
'''

def reinitialize_instance():
    instance_id = 'i-018fb1a61643d5911'
    
    print("Starting reinitialization process...")
    
    try:
        ec2 = boto3.client('ec2', region_name='us-east-1')
        
        # Get instance info
        response = ec2.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        
        # Stop the instance if it's running
        if instance['State']['Name'] == 'running':
            print("Stopping instance...")
            ec2.stop_instances(InstanceIds=[instance_id])
            waiter = ec2.get_waiter('instance_stopped')
            waiter.wait(InstanceIds=[instance_id])
            print("Instance stopped")
        
        # Modify instance attribute to include new user data
        print("Updating instance user data...")
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            UserData={'Value': get_user_data_script()}
        )
        
        # Start the instance
        print("Starting instance...")
        ec2.start_instances(InstanceIds=[instance_id])
        waiter = ec2.get_waiter('instance_running')
        waiter.wait(InstanceIds=[instance_id])
        
        # Get the new public IP
        response = ec2.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        public_ip = instance.get('PublicIpAddress', 'N/A')
        
        print(f"\nInstance reinitialized successfully!")
        print(f"Public IP: {public_ip}")
        print("\nThe application will be available in a few minutes at:")
        print(f"http://{public_ip}")
        
    except Exception as e:
        print(f"Error during reinitialization: {e}")

if __name__ == '__main__':
    reinitialize_instance()
