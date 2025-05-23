#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "❌ Error: Environment argument (dev, stage, prod) is required."
    echo "Usage: $0 <environment>"
    exit 1
fi

ENVIRONMENT=$1
SECRET_FILE="secrets/app.secrets.$ENVIRONMENT.yaml"

VALID_ENVIRONMENTS=("dev" "stage" "prod")
if ! [[ " ${VALID_ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    echo "❌ Invalid environment '$ENVIRONMENT'. Must be one of: ${VALID_ENVIRONMENTS[*]}"
    exit 1
fi

if [ ! -f "$SECRET_FILE" ]; then
    echo "❌ Secret file '$SECRET_FILE' not found."
    exit 1
fi

# Ensure yq is installed and in PATH
if ! command -v yq &> /dev/null
then
    echo "❌ yq could not be found. Please install yq."
    exit 1
fi

echo "🔧 Generating .env from $SECRET_FILE..."

sops -d "$SECRET_FILE" | yq -r '.secrets | to_entries | .[] | "\(.key)=\(.value)"' > .env

echo "✅ .env generated successfully for environment '$ENVIRONMENT'."