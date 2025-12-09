#!/bin/sh

# Write environment variables to file
printenv > /app/.env

# Start cron in the background
crond -f -l 2 &

# Start the main application
exec yarn start