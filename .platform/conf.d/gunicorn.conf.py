bind = "0.0.0.0:8000"
workers = 3
timeout = 300
errorlog = "/var/log/web.stdout.log"  # Use the EB log file instead
accesslog = "/var/log/web.stdout.log"
loglevel = "info"
