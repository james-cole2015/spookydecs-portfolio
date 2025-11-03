#!/bin/bash

# ===============================================================
# README / Script Description:
#
# This script merges the dev branch (admin-dev-001) into the main
# branch, pulls the latest changes from main, and pushes the 
# merged main branch to the remote repository.
# Any failures are logged to fail-log.txt.
#
# Usage:
#   chmod +x merge_and_push.sh
#   ./merge_and_push.sh
#
# Requirements:
#   - Must be run inside a Git repository
#   - Git must be installed and accessible from the PATH
# ===============================================================

# -----------------------------
# Variables
# -----------------------------
DEV_BRANCH="admin-dev-001"
PROD_BRANCH="main"
FAIL_LOG="fail-log.txt"

# -----------------------------
# Ensure we are in a git repository
# -----------------------------
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: Not a git repository." | tee -a "$FAIL_LOG"
  exit 1
fi

# -----------------------------
# Fetch latest changes
# -----------------------------
git fetch origin || { echo "Failed to fetch from remote." | tee -a "$FAIL_LOG"; exit 1; }

# -----------------------------
# Checkout prod branch
# -----------------------------
if ! git checkout "$PROD_BRANCH"; then
  echo "Failed to checkout $PROD_BRANCH." | tee -a "$FAIL_LOG"
  exit 1
fi

# -----------------------------
# Pull latest prod changes
# -----------------------------
if ! git pull origin "$PROD_BRANCH"; then
  echo "Failed to pull latest $PROD_BRANCH changes." | tee -a "$FAIL_LOG"
  exit 1
fi

# -----------------------------
# Merge dev branch into prod
# -----------------------------
if git merge "$DEV_BRANCH"; then
  echo "✅ Dev Changes Merged into Prod!"
else
  echo "❌ Merge failed. Please resolve conflicts." | tee -a "$FAIL_LOG"
  git merge --abort >/dev/null 2>&1
  exit 1
fi

# -----------------------------
# Push merged changes to remote
# -----------------------------
if git push origin "$PROD_BRANCH"; then
  echo "🚀 Changes successfully pushed to origin/$PROD_BRANCH!"
else
  echo "❌ Failed to push changes to remote." | tee -a "$FAIL_LOG"
  exit 1
fi

echo "✅ Merge and push process complete."
