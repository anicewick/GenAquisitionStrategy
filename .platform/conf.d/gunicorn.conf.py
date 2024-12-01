import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
timeout = 300
errorlog = "log/gunicorn-error.log"
accesslog = "log/gunicorn-access.log"
loglevel = "info"
capture_output = True
enable_stdio_inheritance = True
