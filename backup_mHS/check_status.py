import boto3
import requests
import time

def get_instance_logs(instance_id, region='us-east-1'):
    try:
        ec2 = boto3.client('ec2', region_name=region)
        response = ec2.get_console_output(InstanceId=instance_id)
        return response.get('Output', 'No logs available')
    except Exception as e:
        return f"Error getting logs: {e}"

def check_instance_status(instance_id, region='us-east-1'):
    ec2 = boto3.client('ec2', region_name=region)
    
    try:
        # Get instance information
        response = ec2.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        
        # Get status
        status = instance['State']['Name']
        public_ip = instance.get('PublicIpAddress', 'N/A')
        
        # Get system and instance status
        status_response = ec2.describe_instance_status(InstanceIds=[instance_id])
        system_status = 'initializing'
        instance_status = 'initializing'
        
        if status_response['InstanceStatuses']:
            system_status = status_response['InstanceStatuses'][0]['SystemStatus']['Status']
            instance_status = status_response['InstanceStatuses'][0]['InstanceStatus']['Status']
        
        print(f'Instance Status Summary:')
        print(f'------------------------')
        print(f'Instance ID:      {instance_id}')
        print(f'Public IP:        {public_ip}')
        print(f'Instance State:   {status}')
        print(f'System Status:    {system_status}')
        print(f'Instance Status:  {instance_status}')
        
        # Check nginx status by making an HTTP request
        if status == 'running' and public_ip != 'N/A':
            print("\nChecking Services Status:")
            print('------------------------')
            try:
                response = requests.get(f'http://{public_ip}', timeout=5)
                if response.status_code == 200:
                    print('Nginx Status:     running (responding to HTTP requests)')
                else:
                    print(f'Nginx Status:     running (but returned status code {response.status_code})')
            except requests.exceptions.RequestException as e:
                print('Nginx Status:     not responding to HTTP requests')
            
            # Get system logs
            print("\nSystem Logs:")
            print('------------------------')
            logs = get_instance_logs(instance_id)
            print(logs)
        
    except Exception as e:
        print(f"Error checking instance status: {e}")

if __name__ == '__main__':
    instance_id = 'i-04df927de66baeedf'  # New instance ID from setup_ssh.py
    check_instance_status(instance_id)
