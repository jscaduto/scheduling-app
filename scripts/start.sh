#!/bin/sh
set -e

if [ -n "$1" ]; then
  ENV_FILE=".env.$1"
  if [ -f "$ENV_FILE" ]; then
    echo "Loading $ENV_FILE..."
    set -a
    . "$ENV_FILE"
    set +a
  else
    echo "Warning: $ENV_FILE not found, skipping."
  fi
fi

echo "Running prisma db push..."
npx prisma db push

echo "Starting app..."
exec npm start
