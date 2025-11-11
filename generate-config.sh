#!/bin/bash

# Generate config.json from AWS Parameter Store
# Usage: ./generate-config.sh <environment>

# Exit on error, but with custom error handling
set -e

ENV=$1

echo "=== Config Generator Started ==="
echo "Environment: $ENV"
echo "Working Directory: $(pwd)"
echo "AWS CLI Version: $(aws --version)"

if [ -z "$ENV" ]; then
  echo "ERROR: Environment not specified"
  echo "Usage: ./generate-config.sh <environment>"
  exit 1
fi

echo ""
echo "=== Fetching parameters from /spookydecs/config/$ENV/ ==="

# Fetch all parameters under the config path
# Using set +e temporarily to handle "no parameters found" gracefully
set +e
PARAMS=$(aws ssm get-parameters-by-path \
  --path "/spookydecs/config/$ENV/" \
  --recursive \
  --query 'Parameters[*].[Name,Value]' \
  --output text 2>&1)
FETCH_EXIT_CODE=$?
set -e

echo "Fetch exit code: $FETCH_EXIT_CODE"

if [ $FETCH_EXIT_CODE -ne 0 ]; then
  echo "ERROR: Failed to fetch parameters from Parameter Store"
  echo "Output: $PARAMS"
  echo ""
  echo "Common causes:"
  echo "1. IAM role lacks ssm:GetParametersByPath permission"
  echo "2. Parameter path /spookydecs/config/$ENV/ does not exist"
  echo "3. AWS region mismatch"
  exit 1
fi

if [ -z "$PARAMS" ]; then
  echo "WARNING: No parameters found at /spookydecs/config/$ENV/"
  echo "Creating empty config.json"
  echo "{}" > config.json
  echo ""
  echo "=== Empty config.json created ==="
  cat config.json
  exit 0
fi

echo "Found parameters!"
echo "Raw parameters:"
echo "$PARAMS"
echo ""

echo "=== Generating config.json ==="

# Start JSON object
echo "{" > config.json

# Process each parameter
FIRST=true
while IFS=$'\t' read -r NAME VALUE; do
  # Skip empty lines
  if [ -z "$NAME" ]; then
    continue
  fi
  
  # Extract just the variable name (last part after final /)
  VAR_NAME=$(echo "$NAME" | awk -F'/' '{print $NF}')
  
  echo "Processing: $NAME -> $VAR_NAME"
  
  # Add comma for all but first entry
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> config.json
  fi
  
  # Escape double quotes and backslashes in value
  ESCAPED_VALUE=$(echo "$VALUE" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
  echo -n "  \"$VAR_NAME\": \"$ESCAPED_VALUE\"" >> config.json
done <<< "$PARAMS"

# Close JSON object
echo "" >> config.json
echo "}" >> config.json

echo ""
echo "=== config.json generated successfully ==="
cat config.json
echo ""
echo "=== Config Generator Complete ==="