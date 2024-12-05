import boto3
import os
import time

def create_key_pair():
    try:
        ec2 = boto3.client('ec2', region_name='us-east-1')
        
        # Create a new key pair
        key_name = 'genas-key-pair-' + str(int(time.time()))
        print(f"Creating new key pair: {key_name}")
        response = ec2.create_key_pair(KeyName=key_name)
        
        # Save the private key to a file
        key_material = response['KeyMaterial']
        key_file = os.path.join(os.getcwd(), f"{key_name}.pem")
        with open(key_file, 'w') as f:
            f.write(key_material)
        
        # Set correct permissions for the key file
        os.chmod(key_file, 0o400)
        
        print(f"Key pair created and saved to: {key_file}")
        return key_name
        
    except Exception as e:
        print(f"Error creating key pair: {e}")
        return None

def launch_new_instance(key_name):
    try:
        ec2 = boto3.client('ec2', region_name='us-east-1')
        
        # Create security group
        print("Creating security group...")
        sg_response = ec2.create_security_group(
            GroupName=f'genas-sg-{int(time.time())}',
            Description='Security group for GenAS application'
        )
        security_group_id = sg_response['GroupId']
        
        # Add inbound rules
        ec2.authorize_security_group_ingress(
            GroupId=security_group_id,
            IpPermissions=[
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 22,
                    'ToPort': 22,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                },
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 80,
                    'ToPort': 80,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                }
            ]
        )
        
        # Launch new instance
        print("Launching new instance...")
        response = ec2.run_instances(
            ImageId='ami-0261755bbcb8c4a84',  # Amazon Linux 2023 AMI
            InstanceType='t2.micro',
            KeyName=key_name,
            SecurityGroupIds=[security_group_id],
            MinCount=1,
            MaxCount=1,
            UserData='''#!/bin/bash
yum update -y
yum install -y python3 python3-pip nginx
systemctl start nginx
systemctl enable nginx
'''
        )
        
        new_instance_id = response['Instances'][0]['InstanceId']
        print(f"New instance launched: {new_instance_id}")
        
        # Wait for instance to be running
        waiter = ec2.get_waiter('instance_running')
        print("Waiting for instance to start...")
        waiter.wait(InstanceIds=[new_instance_id])
        
        # Get the public IP
        response = ec2.describe_instances(InstanceIds=[new_instance_id])
        public_ip = response['Reservations'][0]['Instances'][0].get('PublicIpAddress')
        print(f"Instance is running. Public IP: {public_ip}")
        
        return new_instance_id, public_ip
        
    except Exception as e:
        print(f"Error launching new instance: {e}")
        return None, None

if __name__ == '__main__':
    # Create new key pair
    key_name = create_key_pair()
    if key_name:
        # Launch new instance with the key pair
        new_instance_id, public_ip = launch_new_instance(key_name)
        if new_instance_id:
            print("\nNext steps:")
            print("1. Install OpenSSH Client if not already installed:")
            print("   Open PowerShell as Administrator and run:")
            print("   Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0")
            print(f"\n2. Update the instance ID in check_status.py to: {new_instance_id}")
            print("\n3. To connect to your instance:")
            print(f"   ssh -i {key_name}.pem ec2-user@{public_ip}")
            print("\n4. You can then use the check_status.py script to verify services")
