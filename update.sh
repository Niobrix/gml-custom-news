#!/bin/bash

echo "Starting update process for GML-Custom-News..."

if [ ! -f "docker-compose.yml" ]; then
    echo "Error: docker-compose.yml not found. Please run this script from the project root directory."
    exit 1
fi

echo "Stopping current containers..."
docker compose down

echo "Pulling latest changes from repository..."
git pull

echo "Building and starting updated containers..."
docker compose up -d --build

echo "Checking service status..."
docker compose ps

echo "Update completed successfully!"
echo "You can check the logs with: docker compose logs -f" 