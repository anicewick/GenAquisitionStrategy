#!/bin/bash
# Create session directory with proper permissions
mkdir -p /tmp/genas_sessions
chmod 777 /tmp/genas_sessions
chown webapp:webapp /tmp/genas_sessions
