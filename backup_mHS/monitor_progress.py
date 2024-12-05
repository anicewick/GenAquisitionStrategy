import boto3
import requests
import time
from datetime import datetime
import os

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def get_instance_info(ec2, instance_id):
    try:
        response = ec2.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        
        # Get basic info
        status = instance['State']['Name']
        public_ip = instance.get('PublicIpAddress', 'N/A')
        launch_time = instance['LaunchTime'].strftime('%Y-%m-%d %H:%M:%S')
        
        # Get detailed status
        status_response = ec2.describe_instance_status(InstanceIds=[instance_id])
        system_status = 'initializing'
        instance_status = 'initializing'
        
        if status_response['InstanceStatuses']:
            system_status = status_response['InstanceStatuses'][0]['SystemStatus']['Status']
            instance_status = status_response['InstanceStatuses'][0]['InstanceStatus']['Status']
            
        return {
            'status': status,
            'public_ip': public_ip,
            'launch_time': launch_time,
            'system_status': system_status,
            'instance_status': instance_status
        }
    except Exception as e:
        print(f"Error getting instance info: {e}")
        return None

def check_application(public_ip):
    try:
        response = requests.get(f'http://{public_ip}', timeout=5)
        return {
            'responding': True,
            'status_code': response.status_code,
            'error': None
        }
    except requests.RequestException as e:
        return {
            'responding': False,
            'status_code': None,
            'error': str(e)
        }

def monitor_progress():
    instance_id = 'i-018fb1a61643d5911'
    ec2 = boto3.client('ec2', region_name='us-east-1')
    start_time = datetime.now()
    
    while True:
        try:
            clear_screen()
            current_time = datetime.now()
            elapsed_time = current_time - start_time
            
            print(f"Server Progress Monitor - {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Monitoring Duration: {str(elapsed_time).split('.')[0]}")
            print("-" * 60)
            
            # Get instance information
            info = get_instance_info(ec2, instance_id)
            if not info:
                print("Unable to get instance information")
                continue
                
            print(f"Instance Status:")
            print(f"  State:           {info['status']}")
            print(f"  Public IP:       {info['public_ip']}")
            print(f"  System Status:   {info['system_status']}")
            print(f"  Instance Status: {info['instance_status']}")
            print(f"  Launch Time:     {info['launch_time']}")
            
            # Check application status
            if info['public_ip'] != 'N/A':
                print("\nApplication Status:")
                app_status = check_application(info['public_ip'])
                if app_status['responding']:
                    print(f"  Status: RUNNING (HTTP {app_status['status_code']})")
                    if app_status['status_code'] == 200:
                        print(f"\nApplication is fully operational!")
                        print(f"Access it at: http://{info['public_ip']}")
                else:
                    print(f"  Status: INITIALIZING")
                    print(f"  Details: {app_status['error']}")
            
            print("\nPress Ctrl+C to stop monitoring")
            
            # Adjust check frequency based on status
            if (info['status'] == 'running' and 
                info['system_status'] == 'ok' and 
                info['instance_status'] == 'ok'):
                time.sleep(10)  # Check every 10 seconds when running
            else:
                time.sleep(5)   # Check more frequently during initialization
                
        except KeyboardInterrupt:
            print("\nMonitoring stopped by user")
            break
        except Exception as e:
            print(f"\nError during monitoring: {e}")
            print("Will retry in 5 seconds...")
            time.sleep(5)

if __name__ == '__main__':
    print("Starting progress monitor...")
    monitor_progress()
