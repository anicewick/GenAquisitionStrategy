#!/bin/bash

# Create application directories with proper permissions
mkdir -p /var/app/current/static/css \
         /var/app/current/static/js \
         /var/app/current/uploads \
         /var/app/current/versions \
         /tmp/genas_sessions

# Set proper permissions for application directories
chown -R webapp:webapp /var/app/current/static \
                      /var/app/current/uploads \
                      /var/app/current/versions \
                      /tmp/genas_sessions

# Set directory permissions
chmod 755 /var/app/current/static \
         /var/app/current/static/css \
         /var/app/current/static/js \
         /var/app/current/uploads \
         /var/app/current/versions
chmod 777 /tmp/genas_sessions

# Copy static files to their proper locations
cp -f /var/app/current/static_src/css/* /var/app/current/static/css/ || true
cp -f /var/app/current/static_src/js/* /var/app/current/static/js/ || true

# Ensure static files are accessible
find /var/app/current/static -type f -exec chmod 644 {} \;
find /var/app/current/static -type d -exec chmod 755 {} \;

# Log the status of key directories
echo "Directory permissions:"
ls -la /var/app/current/static
ls -la /var/app/current/static/css
ls -la /var/app/current/static/js
ls -la /var/app/current/uploads
ls -la /var/app/current/versions
ls -la /tmp/genas_sessions

# Ensure Nginx can access the directories
chmod 755 /var/app/current
