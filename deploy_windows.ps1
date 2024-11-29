# Windows PowerShell Deployment Script for GenAS
param(
    [string]$InstallPath = "C:\GenAS",
    [string]$ApiKey,
    [int]$Port = 5000,
    [switch]$InstallAsService = $false
)

# Function to log messages
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
    Add-Content -Path "deploy_log.txt" -Value "[$timestamp] $Message"
}

# Function to check if running as administrator
function Test-Administrator {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($user)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if running as administrator when installing as service
if ($InstallAsService -and -not (Test-Administrator)) {
    Write-Log "Error: Administrator privileges required to install as service"
    exit 1
}

try {
    # Create installation directory
    Write-Log "Creating installation directory: $InstallPath"
    New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null

    # Extract deployment package
    $deployPackage = Get-ChildItem -Filter "deployment_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $deployPackage) {
        Write-Log "Error: Deployment package not found"
        exit 1
    }

    Write-Log "Extracting deployment package: $($deployPackage.Name)"
    Expand-Archive -Path $deployPackage.FullName -DestinationPath $InstallPath -Force

    # Set up virtual environment
    Write-Log "Creating virtual environment"
    Push-Location $InstallPath
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create virtual environment"
    }

    # Activate virtual environment and install dependencies
    Write-Log "Installing dependencies"
    & "$InstallPath\venv\Scripts\activate.ps1"
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    pip install waitress

    # Create .env file
    if ($ApiKey) {
        Write-Log "Creating .env file"
        Set-Content -Path "$InstallPath\.env" -Value "ANTHROPIC_API_KEY=$ApiKey"
    } else {
        Write-Log "Warning: No API key provided. Please set it manually in .env file"
        Copy-Item "$InstallPath\.env.example" "$InstallPath\.env"
    }

    # Create startup script
    $startupScript = @"
@echo off
call "$InstallPath\venv\Scripts\activate.bat"
waitress-serve --port=$Port app:app
"@
    Set-Content -Path "$InstallPath\start.bat" -Value $startupScript

    if ($InstallAsService) {
        Write-Log "Installing as Windows Service"
        
        # Download NSSM if not present
        $nssmPath = "$InstallPath\nssm.exe"
        if (-not (Test-Path $nssmPath)) {
            $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
            $nssmZip = "$InstallPath\nssm.zip"
            
            Write-Log "Downloading NSSM..."
            Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip
            Expand-Archive -Path $nssmZip -DestinationPath "$InstallPath\nssm-temp"
            Copy-Item "$InstallPath\nssm-temp\nssm-2.24\win64\nssm.exe" $nssmPath
            Remove-Item -Recurse -Force "$InstallPath\nssm-temp"
            Remove-Item -Force $nssmZip
        }

        # Install service using NSSM
        Write-Log "Creating Windows Service 'GenAS'"
        & $nssmPath install GenAS "$InstallPath\venv\Scripts\waitress-serve.exe"
        & $nssmPath set GenAS AppParameters "--port=$Port app:app"
        & $nssmPath set GenAS AppDirectory "$InstallPath"
        & $nssmPath set GenAS DisplayName "GenAS Document AI"
        & $nssmPath set GenAS Description "DoD Acquisition Strategy AI Assistant"
        & $nssmPath set GenAS Start SERVICE_AUTO_START

        # Start the service
        Write-Log "Starting GenAS service"
        Start-Service GenAS
    }

    # Create uninstall script
    $uninstallScript = @"
@echo off
echo Stopping GenAS service...
net stop GenAS
echo Removing GenAS service...
"$InstallPath\nssm.exe" remove GenAS confirm
echo Removing installation directory...
rmdir /S /Q "$InstallPath"
echo Uninstallation complete.
"@
    Set-Content -Path "$InstallPath\uninstall.bat" -Value $uninstallScript

    Write-Log "Installation completed successfully!"
    Write-Log "Installation path: $InstallPath"
    if ($InstallAsService) {
        Write-Log "Service name: GenAS"
        Write-Log "Service status: $(Get-Service GenAS).Status"
    }
    Write-Log "Port: $Port"
    
    # Print next steps
    Write-Log "`nNext steps:"
    if (-not $InstallAsService) {
        Write-Log "1. Run 'start.bat' to start the application"
    }
    if (-not $ApiKey) {
        Write-Log "1. Edit '$InstallPath\.env' and add your Anthropic API key"
    }
    Write-Log "2. Access the application at http://localhost:$Port"
    Write-Log "3. To uninstall, run 'uninstall.bat' as administrator"

} catch {
    Write-Log "Error during deployment: $_"
    exit 1
} finally {
    Pop-Location
}
