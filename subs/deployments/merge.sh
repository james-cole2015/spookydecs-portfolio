#!/bin/bash
# =====================================================
# Script: config-merge.sh
# Purpose: Safely merge config-dev-001 into main, trigger pipeline, and sync branches
# =====================================================

set -e  # Exit immediately if any command fails

BRANCH_SOURCE="deploy-dev-001"
BRANCH_TARGET="main"
REMOTE="origin"

# --- Helper Function ---
print_current_branch() {
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  echo "📍 You are currently on branch: $CURRENT_BRANCH"
}

# --- Create a timestamped backup branch ---
create_backup_branch() {
  TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
  BACKUP_BRANCH="${BRANCH_TARGET}-backup-${TIMESTAMP}"
  echo "🧩 Creating backup branch: $BACKUP_BRANCH..."
  git checkout $BRANCH_TARGET
  git pull $REMOTE $BRANCH_TARGET
  git branch "$BACKUP_BRANCH"
  git push $REMOTE "$BACKUP_BRANCH"
  echo "✅ Backup created and pushed: $REMOTE/$BACKUP_BRANCH"
}

# --- MAIN EXECUTION ---
echo "🔍 Fetching latest updates from all remotes..."
git fetch --all

echo
echo "-----------------------------------------------------"
print_current_branch
echo "-----------------------------------------------------"
echo

# 1. Create Backup
create_backup_branch
print_current_branch

# 2. Merge dev into main
echo
echo "🔁 Checking out $BRANCH_TARGET..."
git checkout $BRANCH_TARGET
print_current_branch

echo "⬇️ Pulling latest from $REMOTE/$BRANCH_TARGET..."
git pull $REMOTE $BRANCH_TARGET

echo "🔀 Merging $BRANCH_SOURCE into $BRANCH_TARGET..."
git merge $BRANCH_SOURCE --no-edit || {
  echo "⚠️ Merge conflicts detected! Resolve them manually, then commit."
  exit 1
}

echo "🚀 Pushing merged $BRANCH_TARGET to remote (triggering pipeline)..."
git push $REMOTE $BRANCH_TARGET

echo
echo "✅ Merge complete. Your pipeline for '$BRANCH_TARGET' should now be running."
echo

# 3. Sync dev branch with updated main
echo "🔄 Syncing $BRANCH_SOURCE with latest $BRANCH_TARGET..."
git checkout $BRANCH_SOURCE
print_current_branch

git pull $REMOTE $BRANCH_SOURCE || echo "⚠️ Could not pull $BRANCH_SOURCE (may not exist remotely yet)."
git merge $BRANCH_TARGET --no-edit || echo "⚠️ Merge conflicts in $BRANCH_SOURCE, resolve manually."
git push $REMOTE $BRANCH_SOURCE

echo
echo "-----------------------------------------------------"
echo "✅ Backup created, branches merged, and both synced."
print_current_branch
echo "-----------------------------------------------------"
