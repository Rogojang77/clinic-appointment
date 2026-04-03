#!/bin/sh

ENV_FILE="/app/.env"
LOG_OUT="/proc/1/fd/1"
LOG_ERR="/proc/1/fd/2"
URL="http://127.0.0.1:3000/api/notifications/whatsapp/appointments-24h"

if [ ! -f "$ENV_FILE" ]; then
  echo "[reminder-cron] missing env file: $ENV_FILE" >> "$LOG_ERR"
  exit 1
fi

SECRET="$(sed -n 's/^REMINDER_CRON_SECRET=//p' "$ENV_FILE" | head -n 1)"
if [ -z "$SECRET" ]; then
  echo "[reminder-cron] REMINDER_CRON_SECRET is empty" >> "$LOG_ERR"
  exit 1
fi

# Busybox wget supports POST using --post-data and custom headers.
wget -qO- \
  --header="x-cron-secret: $SECRET" \
  --header="Content-Type: application/json" \
  --post-data='{}' \
  "$URL" >> "$LOG_OUT" 2>> "$LOG_ERR"
