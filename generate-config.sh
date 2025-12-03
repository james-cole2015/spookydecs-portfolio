#!/bin/bash
set -e

ENV=${1:-dev}
echo "🔧 Generating config.json for environment: $ENV"

# Fetch all parameters from Parameter Store
# Note: Using /spookydecs/config/ (not /spooky-decs/)
echo "📡 Fetching parameters from /spookydecs/config/$ENV/..."
PARAMS=$(aws ssm get-parameters-by-path \
  --path "/spookydecs/config/$ENV/" \
  --recursive \
  --with-decryption \
  --query 'Parameters[*].[Name,Value]' \
  --output json)

# Check if we got any parameters
if [ -z "$PARAMS" ] || [ "$PARAMS" == "[]" ]; then
  echo "❌ No parameters found at /spookydecs/config/$ENV/"
  exit 1
fi

echo "✅ Parameters fetched successfully"

# Build config.json using jq for proper JSON handling
echo "$PARAMS" | jq -r '
  reduce .[] as $item (
    {};
    # Extract the key (last part of the parameter name)
    ($item[0] | split("/") | last) as $key |
    # Get the value
    $item[1] as $value |
    # Try to parse value as JSON, if it fails use as string
    (try ($value | fromjson) catch $value) as $parsed_value |
    # Add to config object
    . + {($key): $parsed_value}
  )
' > config.json

# Validate the generated JSON
if jq empty config.json 2>/dev/null; then
  echo "✅ config.json generated and validated successfully"
  echo "📄 Preview:"
  cat config.json | jq '.'
else
  echo "❌ Generated config.json is invalid"
  cat config.json
  exit 1
fi

# Show key statistics
echo ""
echo "📊 Config Statistics:"
echo "  - Total keys: $(jq 'keys | length' config.json)"
echo "  - Has halloween config: $(jq 'has("halloween")' config.json)"
echo "  - Has christmas config: $(jq 'has("christmas")' config.json)"
echo "  - Has offseason config: $(jq 'has("offseason")' config.json)"
echo "  - Has API_ENDPOINT: $(jq 'has("API_ENDPOINT")' config.json)"

echo ""
echo "✅ Done! config.json ready for deployment"