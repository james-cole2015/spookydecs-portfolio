#!/bin/bash
# process-issue-files.sh — invoked by launchd every 15 minutes
# Calls Claude to process any .md files in the issues inbox

INBOX="/Users/brookshouck/GitHub/spookydecs/Portfolio/app_docs/issues_to_be_added"
LOG="/Users/brookshouck/Library/Logs/issue-enricher.log"
CLAUDE="/Users/brookshouck/.nvm/versions/node/v18.20.8/bin/claude"

# Check if there are any files to process
shopt -s nullglob
files=("$INBOX"/*.md)
if [ ${#files[@]} -eq 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M')] Watch mode: no new files found." >> "$LOG"
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M')] Found ${#files[@]} file(s) to process." >> "$LOG"

# Use Claude CLI to process files
"$CLAUDE" -p "Run the github-issue-enricher skill in watch mode. Process all .md files in $INBOX and create GitHub issues for each one." >> "$LOG" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M')] Watch mode run complete." >> "$LOG"
