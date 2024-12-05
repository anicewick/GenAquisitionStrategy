import os
import shutil
import zipfile
from datetime import datetime
import boto3
import paramiko
from botocore.exceptions import ClientError

def create_deployment_package():
    """Create a deployment package of the application"""
    # Create a timestamp for the package name
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    deploy_dir = f'deployment_{timestamp}'
    
    # Create deployment directory
    os.makedirs(deploy_dir, exist_ok=True)
    
    # Files to copy
    files_to_copy = [
        'app.py',
        'requirements.txt',
        'README.md',
        '.gitignore'
    ]
    
    # Directories to copy
    dirs_to_copy = [
        'static',
        'templates'
    ]
    
    # Copy individual files
    for file in files_to_copy:
        if os.path.exists(file):
            shutil.copy2(file, os.path.join(deploy_dir, file))
            print(f'Copied {file}')
    
    # Copy directories
    for dir_name in dirs_to_copy:
        if os.path.exists(dir_name):
            shutil.copytree(
                dir_name,
                os.path.join(deploy_dir, dir_name),
                dirs_exist_ok=True
            )
            print(f'Copied directory {dir_name}')
    
    # Create empty directories with .gitkeep
    for dir_name in ['uploads', 'versions']:
        dir_path = os.path.join(deploy_dir, dir_name)
        os.makedirs(dir_path, exist_ok=True)
        with open(os.path.join(dir_path, '.gitkeep'), 'w') as f:
            pass
        print(f'Created directory {dir_name} with .gitkeep')
    
    # Create example .env file
    env_example = os.path.join(deploy_dir, '.env.example')
    with open(env_example, 'w') as f:
        f.write('ANTHROPIC_API_KEY=your_api_key_here\n')
    print('Created .env.example')
    
    # Create deployment instructions
    with open(os.path.join(deploy_dir, 'DEPLOY.md'), 'w') as f:
        f.write('''# Deployment Instructions

## Quick Start
1. Copy all files to your server
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\\Scripts\\activate`
   - Unix/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and add your Anthropic API key
6. Run the application:
   - Development: `python app.py`
   - Production (Windows): `waitress-serve --port=5000 app:app`
   - Production (Unix/Linux): `gunicorn -w 4 -b 0.0.0.0:5000 app:app`

## Production Setup

### 1. Install Additional Production Dependencies
```bash
pip install gunicorn    # For Unix/Linux
# OR
pip install waitress    # For Windows
```

### 2. Configure Nginx as Reverse Proxy
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Set Up SSL/TLS (Using Certbot)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

### 4. Create Systemd Service (Unix/Linux)
Create file: `/etc/systemd/system/genas.service`
```ini
[Unit]
Description=GenAS Application
After=network.target

[Service]
User=your_user
WorkingDirectory=/path/to/app
Environment="PATH=/path/to/app/venv/bin"
ExecStart=/path/to/app/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 app:app

[Install]
WantedBy=multi-user.target
```

### 5. Set Up Windows Service (Optional)
Use NSSM (Non-Sucking Service Manager) to create a Windows service:
```batch
nssm install GenAS "C:\\path\\to\\app\\venv\\Scripts\\waitress-serve.exe"
nssm set GenAS AppParameters "--port=5000 app:app"
nssm set GenAS AppDirectory "C:\\path\\to\\app"
```

### 6. Configure Logging
Add to app.py:
```python
import logging
logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### 7. Regular Maintenance
- Set up daily backups of `documents_store.pkl`
- Configure log rotation
- Set up monitoring (e.g., using Prometheus + Grafana)
- Schedule regular security updates

### 8. Security Checklist
- [ ] SSL/TLS configured
- [ ] Firewall rules set
- [ ] Regular backups configured
- [ ] Monitoring in place
- [ ] Security updates automated
- [ ] API keys secured
- [ ] File permissions set correctly
''')
    print('Created DEPLOY.md with detailed instructions')
    
    # Create a ZIP file
    zip_name = f'{deploy_dir}.zip'
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(deploy_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, deploy_dir)
                zipf.write(file_path, arcname)
    
    print(f'\nDeployment package created: {zip_name}')
    print(f'Deployment files in: {deploy_dir}')
    return zip_name, deploy_dir

class EC2Deployer:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
        
    def create_security_group(self):
        try:
            response = self.ec2.create_security_group(
                GroupName='GenAS-SecurityGroup',
                Description='Security group for GenAS application'
            )
            security_group_id = response['GroupId']
            
            # Allow inbound HTTP traffic
            self.ec2.authorize_security_group_ingress(
                GroupId=security_group_id,
                IpPermissions=[
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 80,
                        'ToPort': 80,
                        'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                    },
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 22,
                        'ToPort': 22,
                        'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                    }
                ]
            )
            return security_group_id
        except ClientError as e:
            if e.response['Error']['Code'] == 'InvalidGroup.Duplicate':
                # Get the ID of the existing security group
                response = self.ec2.describe_security_groups(
                    GroupNames=['GenAS-SecurityGroup']
                )
                return response['SecurityGroups'][0]['GroupId']
            raise

    def launch_instance(self, security_group_id, key_name):
        # Launch EC2 instance
        response = self.ec2.run_instances(
            ImageId='ami-0c7217cdde317cfec',  # Amazon Linux 2023 AMI
            InstanceType='t2.micro',
            MinCount=1,
            MaxCount=1,
            SecurityGroupIds=[security_group_id],
            KeyName=key_name,
            UserData='''#!/bin/bash
dnf update -y
dnf install -y python3.11 python3.11-pip git nginx
systemctl start nginx
systemctl enable nginx

# Clone the repository
cd /home/ec2-user
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

# Start and enable the service
systemctl daemon-reload
systemctl start genas
systemctl enable genas

# Restart Nginx
systemctl restart nginx
''',
            TagSpecifications=[
                {
                    'ResourceType': 'instance',
                    'Tags': [
                        {
                            'Key': 'Name',
                            'Value': 'GenAS-Instance'
                        }
                    ]
                }
            ]
        )
        
        instance_id = response['Instances'][0]['InstanceId']
        
        # Wait for the instance to be running
        waiter = self.ec2.get_waiter('instance_running')
        waiter.wait(InstanceIds=[instance_id])
        
        # Get the public IP
        instance = self.ec2.describe_instances(InstanceIds=[instance_id])
        public_ip = instance['Reservations'][0]['Instances'][0]['PublicIpAddress']
        
        return instance_id, public_ip

    def create_key_pair(self):
        try:
            key_pair = self.ec2.create_key_pair(KeyName='GenAS-KeyPair')
            # Save private key to file
            with open('GenAS-KeyPair.pem', 'w') as f:
                f.write(key_pair['KeyMaterial'])
            os.chmod('GenAS-KeyPair.pem', 0o400)
            return 'GenAS-KeyPair'
        except ClientError as e:
            if e.response['Error']['Code'] == 'InvalidKeyPair.Duplicate':
                return 'GenAS-KeyPair'
            raise

def main():
    deployer = EC2Deployer()
    
    print("Creating security group...")
    security_group_id = deployer.create_security_group()
    print(f"Security group created: {security_group_id}")
    
    print("Creating key pair...")
    key_name = deployer.create_key_pair()
    print(f"Key pair created: {key_name}")
    
    print("Launching EC2 instance...")
    instance_id, public_ip = deployer.launch_instance(security_group_id, key_name)
    print(f"Instance launched: {instance_id}")
    print(f"Public IP: {public_ip}")
    print("\nDeployment completed!")
    print("The application will be available at: http://" + public_ip)
    print("Note: It may take a few minutes for the instance to fully initialize and the application to start.")

if __name__ == '__main__':
    zip_name, deploy_dir = create_deployment_package()
    main()
