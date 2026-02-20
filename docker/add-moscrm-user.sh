#!/bin/bash
# One-time script: Add moscrm user to existing MongoDB volume
# Run when: moscrm user doesn't exist (auth fails, 503 on login)

set -e
VOLUME="${1:-clinic-appointment_mongodb_data}"
echo "Using volume: $VOLUME"

echo "Stopping clinic-mongo if running..."
docker stop clinic-mongo 2>/dev/null || true

echo "Starting temporary MongoDB without auth to create user..."
docker run --rm -d \
  --name mongo-add-user \
  -v "$VOLUME:/data/db" \
  mongo:8 \
  mongod --bind_ip_all

echo "Waiting for MongoDB to start..."
sleep 8

echo "Creating moscrm user in clinicdb..."
docker exec mongo-add-user mongosh --quiet --eval "
  db = db.getSiblingDB('clinicdb');
  db.createUser({
    user: 'moscrm',
    pwd: 'ClinicDB@166091',
    roles: [
      { role: 'readWrite', db: 'clinicdb' },
      { role: 'dbAdmin', db: 'clinicdb' }
    ]
  });
  print('User moscrm created successfully.');
" mongodb://localhost:27017

echo "Stopping temporary container..."
docker stop mongo-add-user

echo "Done. Set MONGO_PASSWORD=ClinicDB%40166091 and run: docker-compose up -d"
