#!/bin/bash
# ===== Faction Wars Server Health Check & Maintenance =====
# Gap #28: Automated health checks, log cleanup, DB backup

SERVER_URL="${SERVER_URL:-http://localhost:4000}"
LOG_DIR="${LOG_DIR:-/tmp}"
DB_PATH="$(dirname "$0")/factionwars.db"
BACKUP_DIR="${BACKUP_DIR:-/tmp/rts-backups}"

# Health check
echo "[$(date)] Health check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/api/rooms" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
  echo "[OK] Server responding (HTTP $HTTP_CODE)"
else
  echo "[FAIL] Server not responding (HTTP $HTTP_CODE)"
  # Attempt restart
  cd "$(dirname "$0")" && PORT=4000 nohup node server.js >> "$LOG_DIR/rts-server.log" 2>&1 &
  echo "[RESTART] Server restarted (PID $!)"
fi

# Log cleanup (keep last 7 days)
echo "[$(date)] Log cleanup..."
find "$LOG_DIR" -name "rts-*.log" -mtime +7 -delete 2>/dev/null
echo "[OK] Old logs cleaned"

# Database backup
if [ -f "$DB_PATH" ]; then
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/factionwars_$(date +%Y%m%d_%H%M%S).db"
  cp "$DB_PATH" "$BACKUP_FILE"
  echo "[OK] DB backed up to $BACKUP_FILE"
  # Keep only last 10 backups
  ls -t "$BACKUP_DIR"/factionwars_*.db 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
fi

echo "[$(date)] Maintenance complete."
