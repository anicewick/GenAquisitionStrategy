import boto3
import time
import requests
from datetime import datetime
import os

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def monitor_instance(instance_id, region='us-east-1'):
    ec2 = boto3.client('ec2', region_name=region)
    
    while True:
        try:
            # Get instance information
            response = ec2.describe_instances(InstanceIds=[instance_id])
            instance = response['Reservations'][0]['Instances'][0]
            
            # Get instance status
            status = instance['State']['Name']
            public_ip = instance.get('PublicIpAddress', 'N/A')
            
            # Get system status and instance status
            status_response = ec2.describe_instance_status(InstanceIds=[instance_id])
            system_status = 'initializing'
            instance_status = 'initializing'
            
            if status_response['InstanceStatuses']:
                system_status = status_response['InstanceStatuses'][0]['SystemStatus']['Status']
                instance_status = status_response['InstanceStatuses'][0]['InstanceStatus']['Status']
            
            # Try to connect to the application
            app_status = 'not responding'
            if public_ip != 'N/A':
                try:
                    response = requests.get(f'http://{public_ip}', timeout=5)
                    app_status = f'responding (status code: {response.status_code})'
                except requests.RequestException:
                    pass
            
            # Clear screen and print status
            clear_screen()
            print(f'Status Monitor - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
            print('-' * 50)
            print(f'Instance ID:      {instance_id}')
            print(f'Public IP:        {public_ip}')
            print(f'Instance State:   {status}')
            print(f'System Status:    {system_status}')
            print(f'Instance Status:  {instance_status}')
            print(f'Application:      {app_status}')
            print('-' * 50)
            print('Press Ctrl+C to stop monitoring')
            
            if status == 'terminated':
                print("\nInstance has been terminated. Stopping monitoring.")
                break
                
            # If everything is running and app is responding, we can slow down the polling
            if (status == 'running' and 
                system_status == 'ok' and 
                instance_status == 'ok' and 
                'responding' in app_status):
                time.sleep(30)  # Check every 30 seconds
            else:
                time.sleep(10)  # Check every 10 seconds during initialization
                
        except KeyboardInterrupt:
            print("\nMonitoring stopped by user")
            break
        except Exception as e:
            print(f"\nError: {e}")
            print("Retrying in 10 seconds...")
            time.sleep(10)

if __name__ == '__main__':
    # Instance ID from the previous deployment
    instance_id = 'i-018fb1a61643d5911'
    try:
        monitor_instance(instance_id)
    except Exception as e:
        print(f"Fatal error: {e}")
        input("Press Enter to exit...")
