#!/bin/bash

# Install Python 3.11 and set it as default
amazon-linux-extras enable python3.11
yum install -y python3.11
alternatives --set python3 /usr/bin/python3.11

# Verify Python version
python3 --version

# Install pip for Python 3.11
curl -O https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py
rm get-pip.py

# Upgrade pip
python3 -m pip install --upgrade pip
