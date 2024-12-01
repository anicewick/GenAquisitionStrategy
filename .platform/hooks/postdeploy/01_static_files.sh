#!/bin/bash

# Create application directories with proper permissions
mkdir -p /var/app/current/uploads \
         /var/app/current/versions \
         /var/app/current/static \
         /tmp/genas_sessions

# Set proper permissions for application directories
chown -R webapp:webapp /var/app/current/uploads \
                      /var/app/current/versions \
                      /var/app/current/static \
                      /tmp/genas_sessions

# Set directory permissions
chmod 755 /var/app/current/uploads \
         /var/app/current/versions \
         /var/app/current/static
chmod 777 /tmp/genas_sessions

# Ensure static files are accessible
find /var/app/current/static -type f -exec chmod 644 {} \;
find /var/app/current/static -type d -exec chmod 755 {} \;

# Log the status of key directories
echo "Directory permissions:"
ls -la /var/app/current/static
ls -la /var/app/current/uploads
ls -la /var/app/current/versions
ls -la /tmp/genas_sessions
