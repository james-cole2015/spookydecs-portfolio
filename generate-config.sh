#!/bin/bash

# Generate config.json from AWS Parameter Store
# Usage: ./generate-config.sh <environment>

set -e

ENV=$1

if [ -z "$ENV" ]; then
  echo "Error: Environment not specified"
  exit 1
fi

echo "Fetching all parameters from /spookydecs/config/$ENV/"

# Fetch all parameters under the config path
PARAMS=$(aws ssm get-parameters-by-path \
  --path "/spookydecs/config/$ENV/" \
  --recursive \
  --query 'Parameters[*].[Name,Value]' \
  --output text)

if [ -z "$PARAMS" ]; then
  echo "Warning: No parameters found at /spookydecs/config/$ENV/"
  echo "Creating empty config.json"
  echo "{}" > config.json
  exit 0
fi

echo "Found parameters, generating config.json..."

# Start JSON object
echo "{" > config.json

# Process each parameter
FIRST=true
while IFS=$'\t' read -r NAME VALUE; do
  # Extract just the variable name (last part after final /)
  VAR_NAME=$(echo "$NAME" | awk -F'/' '{print $NF}')
  
  # Add comma for all but first entry
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> config.json
  fi
  
  # Escape double quotes in value and add to JSON
  ESCAPED_VALUE=$(echo "$VALUE" | sed 's/"/\\"/g')
  echo -n "  \"$VAR_NAME\": \"$ESCAPED_VALUE\"" >> config.json
  
  echo "  Added: $VAR_NAME"
done <<< "$PARAMS"

# Close JSON object
echo "" >> config.json
echo "}" >> config.json

echo "config.json generated successfully:"
cat config.json

echo ""
echo "config.json is ready for deployment"