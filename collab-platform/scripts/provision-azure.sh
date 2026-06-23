#!/usr/bin/env bash
#
# Provision the INDEPENDENT collab-platform infrastructure in Azure:
#   - its own Postgres Flexible Server + database
#   - its own Container App (collab-app) with secrets + env
#   - ACR pull access via the app's managed identity
#
# Run this in Azure Cloud Shell ( https://shell.azure.com ) — it is already
# authenticated as you and has `az` preinstalled. Idempotent: safe to re-run.
#
# Secrets (DB password, AUTH_SECRET) are generated here and set directly on the
# Container App. They never go to GitHub. The DATABASE_URL is printed at the end
# for optional LOCAL development only — keep it private.
#
set -euo pipefail

# ---- Config ----
RG="rg-aitracker"            # reuse AI Tracker's resource group
ACR="aitrackeracr"           # reuse the existing registry (separate image)
APP="collab-app"
PG_SERVER="pgh-collab-db"    # globally-unique; change if taken
PG_DB="pgh_collab"
PG_ADMIN="pghadmin"

echo "▶ Subscription: $(az account show --query name -o tsv)"

LOCATION="$(az group show -n "$RG" --query location -o tsv)"
echo "▶ Region: $LOCATION"

# Reuse the existing Container Apps environment in the resource group.
ENVIRONMENT="$(az containerapp env list -g "$RG" --query '[0].name' -o tsv)"
if [ -z "${ENVIRONMENT:-}" ]; then
  echo "✖ No Container Apps environment found in $RG. Create one or set ENVIRONMENT." >&2
  exit 1
fi
echo "▶ Container Apps environment: $ENVIRONMENT"

# ---- Generated secrets (alphanumeric pw => clean DATABASE_URL, no encoding) ----
PG_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | cut -c1-24)Aa1"
AUTH_SECRET="$(openssl rand -base64 32)"

# ---- 1. Postgres Flexible Server ----
if ! az postgres flexible-server show -g "$RG" -n "$PG_SERVER" &>/dev/null; then
  echo "▶ Creating Postgres server $PG_SERVER (Burstable B1ms)…"
  az postgres flexible-server create \
    -g "$RG" -n "$PG_SERVER" -l "$LOCATION" \
    --admin-user "$PG_ADMIN" --admin-password "$PG_PASSWORD" \
    --tier Burstable --sku-name Standard_B1ms \
    --storage-size 32 --version 16 \
    --public-access 0.0.0.0 --yes -o none
else
  echo "▶ Postgres server exists; resetting admin password…"
  az postgres flexible-server update -g "$RG" -n "$PG_SERVER" \
    --admin-password "$PG_PASSWORD" -o none
fi

# Ensure "allow Azure services" firewall rule (for Container Apps egress).
az postgres flexible-server firewall-rule create \
  -g "$RG" -n "$PG_SERVER" --rule-name allow-azure \
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 -o none 2>/dev/null || true

# Database (ignore if it already exists).
az postgres flexible-server db create -g "$RG" -s "$PG_SERVER" -d "$PG_DB" -o none 2>/dev/null || true

PG_HOST="$(az postgres flexible-server show -g "$RG" -n "$PG_SERVER" \
  --query fullyQualifiedDomainName -o tsv)"
DATABASE_URL="postgresql://${PG_ADMIN}:${PG_PASSWORD}@${PG_HOST}:5432/${PG_DB}?sslmode=require"

# ---- 2. Container App ----
if ! az containerapp show -g "$RG" -n "$APP" &>/dev/null; then
  echo "▶ Creating Container App $APP…"
  az containerapp create \
    -g "$RG" -n "$APP" --environment "$ENVIRONMENT" \
    --image mcr.microsoft.com/k8se/quickstart:latest \
    --target-port 3000 --ingress external \
    --min-replicas 1 --max-replicas 1 -o none
fi

echo "▶ Setting secrets + env on $APP…"
az containerapp secret set -g "$RG" -n "$APP" \
  --secrets database-url="$DATABASE_URL" auth-secret="$AUTH_SECRET" -o none

az containerapp update -g "$RG" -n "$APP" \
  --set-env-vars \
    AUTH_DISABLED=true \
    DATABASE_URL=secretref:database-url \
    AUTH_SECRET=secretref:auth-secret -o none

# ---- 3. ACR pull via managed identity ----
echo "▶ Wiring ACR pull (managed identity)…"
az containerapp identity assign -g "$RG" -n "$APP" --system-assigned -o none
PRINCIPAL_ID="$(az containerapp show -g "$RG" -n "$APP" --query identity.principalId -o tsv)"
ACR_ID="$(az acr show -n "$ACR" --query id -o tsv)"
az role assignment create --assignee "$PRINCIPAL_ID" --role AcrPull --scope "$ACR_ID" -o none 2>/dev/null || true
az containerapp registry set -g "$RG" -n "$APP" --server "${ACR}.azurecr.io" --identity system -o none

APP_FQDN="$(az containerapp show -g "$RG" -n "$APP" \
  --query properties.configuration.ingress.fqdn -o tsv)"

cat <<EOF

==================================================================
✅ Provisioned.
   App URL : https://${APP_FQDN}
   (Shows a placeholder image until the first GitHub Actions deploy.)

For LOCAL dev only — add to collab-platform/.env.local and KEEP PRIVATE:
DATABASE_URL="${DATABASE_URL}"

Next: trigger the deploy (merge PR #1, or re-run the deploy-collab workflow).
==================================================================
EOF
