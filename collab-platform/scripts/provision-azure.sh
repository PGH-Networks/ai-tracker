#!/usr/bin/env bash
#
# Recreate the collab-platform Azure infrastructure FROM SCRATCH. This mirrors
# exactly how the live environment was provisioned (subscription "AI Playground",
# region eastus2). Idempotent-ish; intended as documentation + disaster recovery.
#
# Prereqs: `az login`, and rights to create resources in the target subscription.
# Note: managed-identity ACR pull needs Microsoft.Authorization/roleAssignments
# write (Owner / User Access Admin). We use ACR admin credentials instead, which
# only needs Contributor on the registry.
#
set -euo pipefail

SUB="AI Playground"
RG="rg-collab-platform"
LOC="eastus2"
ACR="pghcollabacr"
ENVIRONMENT="collab-env"
APP="collab-app"
PG_SERVER="pgh-collab-db"   # globally unique
PG_DB="pgh_collab"
PG_ADMIN="pghadmin"

az account set --subscription "$SUB"

# Secrets generated here (alphanumeric pw => clean DATABASE_URL).
PGPW="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | cut -c1-24)Aa1"
AUTH_SECRET="$(openssl rand -base64 32)"
MYIP="$(curl -s https://api.ipify.org)"

echo "▶ Resource group + registry…"
az group create -n "$RG" -l "$LOC" -o none
az acr create -g "$RG" -n "$ACR" --sku Basic -o none

echo "▶ Postgres Flexible Server (~5 min)…"
az postgres flexible-server create \
  -g "$RG" -n "$PG_SERVER" -l "$LOC" \
  --admin-user "$PG_ADMIN" --admin-password "$PGPW" \
  --tier Burstable --sku-name Standard_B1ms \
  --storage-size 32 --version 16 \
  --public-access "$MYIP" --yes -o none
az postgres flexible-server db create -g "$RG" -s "$PG_SERVER" -d "$PG_DB" -o none
az postgres flexible-server firewall-rule create -g "$RG" -n "$PG_SERVER" \
  --rule-name allow-azure --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 -o none
PG_HOST="$(az postgres flexible-server show -g "$RG" -n "$PG_SERVER" --query fullyQualifiedDomainName -o tsv)"
DATABASE_URL="postgresql://${PG_ADMIN}:${PGPW}@${PG_HOST}:5432/${PG_DB}?sslmode=require"

echo "▶ Apply migrations + seed (from this machine; your IP is whitelisted)…"
( cd "$(dirname "$0")/.." && DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy \
  && DATABASE_URL="$DATABASE_URL" npx tsx prisma/seed.ts )

echo "▶ Build image…"
( cd "$(dirname "$0")/.." && az acr build --registry "$ACR" --image collab:latest --file Dockerfile . )

echo "▶ Container Apps environment (~3 min)…"
az containerapp env create -g "$RG" -n "$ENVIRONMENT" -l "$LOC" -o none

echo "▶ ACR admin creds (managed identity needs role-assignment rights we lack)…"
az acr update -n "$ACR" --admin-enabled true -o none
ACR_USER="$(az acr credential show -n "$ACR" --query username -o tsv)"
ACR_PASS="$(az acr credential show -n "$ACR" --query 'passwords[0].value' -o tsv)"

echo "▶ Container App…"
az containerapp create \
  -g "$RG" -n "$APP" --environment "$ENVIRONMENT" \
  --image "$ACR.azurecr.io/collab:latest" \
  --registry-server "$ACR.azurecr.io" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --target-port 3000 --ingress external \
  --min-replicas 1 --max-replicas 1 --cpu 0.5 --memory 1.0Gi \
  --secrets database-url="$DATABASE_URL" auth-secret="$AUTH_SECRET" \
  --env-vars AUTH_DISABLED=true DATABASE_URL=secretref:database-url AUTH_SECRET=secretref:auth-secret \
  -o none

FQDN="$(az containerapp show -g "$RG" -n "$APP" --query properties.configuration.ingress.fqdn -o tsv)"
cat <<EOF

==================================================================
✅ Provisioned.  App URL: https://${FQDN}
For LOCAL dev (keep private): DATABASE_URL="${DATABASE_URL}"
==================================================================
EOF
