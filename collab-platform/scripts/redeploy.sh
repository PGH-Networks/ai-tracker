#!/usr/bin/env bash
#
# Redeploy collab-platform to Azure using your `az login` (the working path
# today — CI auto-deploy needs an Azure admin to provision a service principal,
# see README). Builds the image in ACR and rolls out a new revision by digest.
#
# Usage:  ./scripts/redeploy.sh
#
set -euo pipefail

RG="rg-collab-platform"
ACR="pghcollabacr"
APP="collab-app"

cd "$(dirname "$0")/.."

echo "▶ Building image in ACR…"
az acr build --registry "$ACR" --image collab:latest --file Dockerfile .

DIGEST="$(az acr repository show -n "$ACR" --image collab:latest --query digest -o tsv)"
echo "▶ Deploying digest $DIGEST…"
az containerapp update -g "$RG" -n "$APP" \
  --image "$ACR.azurecr.io/collab@$DIGEST" \
  --revision-suffix "r$(date +%s)" -o none

FQDN="$(az containerapp show -g "$RG" -n "$APP" \
  --query properties.configuration.ingress.fqdn -o tsv)"
echo "✅ Deployed: https://$FQDN"
