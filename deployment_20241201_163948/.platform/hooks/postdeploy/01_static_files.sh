#!/bin/bash

# Create application directories with proper permissions
mkdir -p /var/app/current/static/css \
         /var/app/current/static/js \
         /var/app/current/uploads \
         /var/app/current/versions \
         /tmp/genas_sessions \
         /var/log/gunicorn

# Set proper permissions for application directories
chown -R webapp:webapp /var/app/current/static \
                      /var/app/current/uploads \
                      /var/app/current/versions \
                      /tmp/genas_sessions \
                      /var/log/gunicorn

# Set directory permissions
chmod 755 /var/app/current/static \
         /var/app/current/static/css \
         /var/app/current/static/js \
         /var/app/current/uploads \
         /var/app/current/versions \
         /var/log/gunicorn

# Create default static files if they don't exist
if [ ! -f /var/app/current/static/css/style.css ]; then
    echo "/* Default styles */" > /var/app/current/static/css/style.css
fi

if [ ! -f /var/app/current/static/js/main.js ]; then
    echo "// Default JavaScript" > /var/app/current/static/js/main.js
fi

# Copy static files if source exists
if [ -d /var/app/current/static_src ]; then
    cp -rf /var/app/current/static_src/css/* /var/app/current/static/css/ 2>/dev/null || true
    cp -rf /var/app/current/static_src/js/* /var/app/current/static/js/ 2>/dev/null || true
fi

# Ensure static files are accessible
find /var/app/current/static -type f -exec chmod 644 {} \;
find /var/app/current/static -type d -exec chmod 755 {} \;

# Verify directories exist and show permissions
echo "Directory structure:"
ls -la /var/app/current/static/css
ls -la /var/app/current/static/js

# Ensure nginx configuration is valid
nginx -t

# Reload nginx if configuration is valid
if [ $? -eq 0 ]; then
    systemctl reload nginx || systemctl restart nginx
else
    echo "Nginx configuration test failed"
    exit 1
fi
