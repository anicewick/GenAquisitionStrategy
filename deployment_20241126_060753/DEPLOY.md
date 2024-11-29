# Deployment Instructions

## Quick Start
1. Copy all files to your server
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
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
nssm install GenAS "C:\path\to\app\venv\Scripts\waitress-serve.exe"
nssm set GenAS AppParameters "--port=5000 app:app"
nssm set GenAS AppDirectory "C:\path\to\app"
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
