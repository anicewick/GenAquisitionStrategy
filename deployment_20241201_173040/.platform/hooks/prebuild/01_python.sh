#!/bin/bash

# Install Python 3.11 using dnf (Amazon Linux 2023)
dnf install -y python3.11

# Create symbolic link to ensure python3 points to python3.11
ln -sf /usr/bin/python3.11 /usr/bin/python3

# Verify Python version
python3 --version

# Install pip for Python 3.11
curl -O https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py
rm get-pip.py

# Upgrade pip without using cache
python3 -m pip install --no-cache-dir --upgrade pip setuptools wheel
