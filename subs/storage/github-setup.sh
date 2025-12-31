#!/bin/bash
# ==========================================================
# Script: setup_storage_repo.sh
# Purpose: Connect local repo to GitHub and push to main/dev
# Author: Cole's automation assistant
# ==========================================================

# --- CONFIGURATION ---
LOCAL_DIR="/Users/brooks/GitHub2/storage-spookydecs.com"
REMOTE_URL="https://github.com/james-cole2015/storage-spookydecs.git"
MAIN_BRANCH="main"
DEV_BRANCH="dev-storage-001"

# --- SAFETY CHECKS ---
if [ ! -d "$LOCAL_DIR" ]; then
  echo "❌ Error: Local directory not found at $LOCAL_DIR"
  exit 1
fi

cd "$LOCAL_DIR" || exit

# --- VERIFY GIT INIT ---
if [ ! -d ".git" ]; then
  echo "⚠️  Git not initialized in this directory. Run 'git init' first."
  exit 1
fi

# --- CHECK EXISTING REMOTE ---
EXISTING_REMOTE=$(git remote get-url origin 2>/dev/null)

if [ -z "$EXISTING_REMOTE" ]; then
  echo "🔗 Adding remote origin..."
  git remote add origin "$REMOTE_URL"
else
  echo "✅ Remote already set: $EXISTING_REMOTE"
fi

# --- ENSURE REMOTE IS ACCESSIBLE ---
echo "🔍 Checking remote access..."
if git ls-remote "$REMOTE_URL" &>/dev/null; then
  echo "✅ Remote accessible."
else
  echo "⚠️  Could not access remote. Check your SSH keys or GitHub authentication."
  echo "   - If using SSH: ensure your SSH key is added to GitHub."
  echo "   - If using HTTPS: you may be prompted for credentials."
  exit 1
fi

# --- COMMIT LOCAL CHANGES ---
echo "📦 Adding and committing local files..."
git add .
COMMIT_MSG="Initial setup commit - $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG" || echo "⚠️  No new changes to commit."

# --- PUSH TO MAIN ---
echo "🚀 Pushing to $MAIN_BRANCH..."
git branch -M "$MAIN_BRANCH"
git push -u origin "$MAIN_BRANCH"

# --- CREATE/UPDATE DEV BRANCH ---
echo "🚀 Syncing $DEV_BRANCH branch..."
git checkout -B "$DEV_BRANCH"
git push -u origin "$DEV_BRANCH"

# --- RETURN TO MAIN ---
git checkout "$MAIN_BRANCH"

echo "✅ All done!"
echo "Pushed to:"
echo " - $REMOTE_URL ($MAIN_BRANCH)"
echo " - $REMOTE_URL ($DEV_BRANCH)"
