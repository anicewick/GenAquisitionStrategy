import boto3
import requests
import paramiko
import time
from botocore.exceptions import ClientError

def check_server_status(instance_id, region='us-east-1'):
    print("\nChecking EC2 instance status...")
    ec2 = boto3.client('ec2', region_name=region)
    
    try:
        # Get instance information
        response = ec2.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        
        status = instance['State']['Name']
        public_ip = instance.get('PublicIpAddress', 'N/A')
        
        print(f"Instance State: {status}")
        print(f"Public IP: {public_ip}")
        
        if status != 'running':
            print("Instance is not running. Starting instance...")
            ec2.start_instances(InstanceIds=[instance_id])
            print("Waiting for instance to start...")
            waiter = ec2.get_waiter('instance_running')
            waiter.wait(InstanceIds=[instance_id])
            
            # Get new public IP after starting
            response = ec2.describe_instances(InstanceIds=[instance_id])
            instance = response['Reservations'][0]['Instances'][0]
            public_ip = instance.get('PublicIpAddress', 'N/A')
            print(f"Instance started. New Public IP: {public_ip}")
        
        return public_ip
        
    except Exception as e:
        print(f"Error checking instance: {e}")
        return None

def check_application(public_ip):
    print("\nChecking application status...")
    try:
        response = requests.get(f'http://{public_ip}', timeout=5)
        print(f"Application Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Application is responding successfully!")
        else:
            print(f"Application is responding but returned status code {response.status_code}")
    except requests.RequestException as e:
        print(f"Application is not responding: {e}")

def check_services(public_ip):
    print("\nChecking system services...")
    try:
        # Try to get the instance system logs
        ec2 = boto3.client('ec2', region_name='us-east-1')
        response = ec2.get_console_output(InstanceId='i-018fb1a61643d5911')
        if 'Output' in response:
            print("Last few lines of system log:")
            log_lines = response.get('Output', '').split('\n')[-5:]
            for line in log_lines:
                print(f"  {line}")
    except Exception as e:
        print(f"Could not get system logs: {e}")

def main():
    instance_id = 'i-018fb1a61643d5911'  # Your instance ID
    
    print("Starting server verification...")
    print("-" * 50)
    
    # Check server status and get public IP
    public_ip = check_server_status(instance_id)
    if not public_ip:
        print("Could not get server public IP. Verification failed.")
        return
    
    # Give the server a moment to fully initialize if it was just started
    print("\nWaiting 30 seconds for services to initialize...")
    time.sleep(30)
    
    # Check if the application is responding
    check_application(public_ip)
    
    # Check system services
    check_services(public_ip)
    
    print("\nVerification complete!")
    print(f"You can access the application at: http://{public_ip}")

if __name__ == '__main__':
    main()
