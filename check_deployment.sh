#!/bin/bash

echo "=== Checking Nginx Status ==="
sudo systemctl status nginx

echo -e "\n=== Checking GenAS Service Status ==="
sudo systemctl status genas

echo -e "\n=== Checking Nginx Error Logs ==="
sudo tail -n 50 /var/log/nginx/error.log

echo -e "\n=== Checking GenAS Service Logs ==="
sudo journalctl -u genas --no-pager -n 50

echo -e "\n=== Checking Socket File ==="
ls -l /home/ubuntu/genas/genas.sock

echo -e "\n=== Checking File Permissions ==="
ls -l /home/ubuntu/genas/
ls -l /home/ubuntu/genas/app.py

echo -e "\n=== Checking Process Status ==="
ps aux | grep -E "gunicorn|python|nginx" | grep -v grep
