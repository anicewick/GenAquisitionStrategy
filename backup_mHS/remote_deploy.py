import os
import subprocess
import sys
from datetime import datetime
import time

def run_command(command, cwd=None, check_error=True):
    print(f"Running command: {command}")
    process = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
    if check_error and process.returncode != 0:
        print(f"Error: {process.stderr}")
        sys.exit(1)
    return process.stdout.strip()

def main():
    # Configuration
    instance_id = "i-04df927de66baeedf"
    key_path = "genas-key-pair-1733087599.pem"
    remote_user = "ubuntu"
    remote_host = "54.83.117.12"
    app_dir = "/home/ubuntu/genas"
    
    # Ensure key file has correct permissions
    os.chmod(key_path, 0o600)
    
    # Create deployment package
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    deployment_dir = f"deployment_{timestamp}"
    
    # Create deployment directory
    os.makedirs(deployment_dir, exist_ok=True)
    
    # Copy necessary files
    files_to_copy = [
        "app.py",
        "requirements.txt",
        "static",
        "templates",
        ".platform",
        "Procfile",
        "deploy_linux.sh",
    ]
    
    for item in files_to_copy:
        if os.path.isdir(item):
            run_command(f'xcopy /E /I "{item}" "{deployment_dir}\\{item}"')
        else:
            run_command(f'copy "{item}" "{deployment_dir}"')
    
    # Create deployment archive
    deployment_zip = f"{deployment_dir}.zip"
    run_command(f'powershell Compress-Archive -Path "{deployment_dir}/*" -DestinationPath "{deployment_zip}" -Force')
    
    # Create remote directory and set permissions
    ssh_command = f'ssh -i {key_path} -o StrictHostKeyChecking=no {remote_user}@{remote_host}'
    run_command(f'{ssh_command} "rm -rf {app_dir}/*"')  # Clean existing directory
    run_command(f'{ssh_command} "mkdir -p {app_dir} && chmod 755 {app_dir}"')
    
    # Transfer files to server
    scp_command = f'scp -i {key_path} -o StrictHostKeyChecking=no'
    run_command(f'{scp_command} "{deployment_zip}" {remote_user}@{remote_host}:{app_dir}/')
    run_command(f'{scp_command} "deploy_linux.sh" {remote_user}@{remote_host}:{app_dir}/')
    
    # Verify files exist and set permissions
    commands = [
        f"cd {app_dir}",
        f"ls -la",  # List files to verify
        "chmod +x deploy_linux.sh",
        f"unzip -o {os.path.basename(deployment_zip)}",
        "chmod +x deploy_linux.sh",  # Ensure script is executable after unzip
        "./deploy_linux.sh --path /home/ubuntu/genas --port 5000"
    ]
    
    for cmd in commands:
        output = run_command(f'{ssh_command} "{cmd}"', check_error=False)
        print(f"Command output: {output}")
        time.sleep(1)  # Add small delay between commands
    
    print("Deployment completed successfully!")

if __name__ == "__main__":
    main()
