#!/usr/bin/env bash
# scripts/inject-wrangler-env.sh
#
# Inject environment-specific variables into wrangler.toml before deploying.
#
# Usage:
#   ./scripts/inject-wrangler-env.sh [environment]
#
# Arguments:
#   environment  — One of: development, staging, production (default: production)
#
# Environment variables (set in CI or .env):
#   ALLOWED_ORIGINS          — Comma-separated CORS origins
#   STELLAR_TOML_MAX_AGE     — Cache TTL for stellar.toml (seconds)
#   DEFAULT_MAX_AGE          — Cache TTL for other .well-known paths
#   CF_ACCOUNT_ID            — Cloudflare account ID
#   CF_API_TOKEN             — Cloudflare API token
#
# The script creates a temporary wrangler.toml with injected values,
# runs the deployment, then cleans up.

set -euo pipefail

ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WRANGLER_TEMPLATE="$PROJECT_ROOT/wrangler.toml"
WRANGLER_TEMP="$PROJECT_ROOT/wrangler.toml.deploy"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[inject-env]${NC} $*"; }
warn() { echo -e "${YELLOW}[inject-env]${NC} $*"; }
error() { echo -e "${RED}[inject-env]${NC} $*" >&2; }

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
  error "Invalid environment: $ENVIRONMENT"
  error "Must be one of: development, staging, production"
  exit 1
fi

log "Injecting variables for environment: $ENVIRONMENT"

# Check required tools
if ! command -v wrangler &>/dev/null; then
  error "wrangler CLI not found. Install with: npm install -g wrangler"
  exit 1
fi

# Copy template to temp file
cp "$WRANGLER_TEMPLATE" "$WRANGLER_TEMP"

# Inject ALLOWED_ORIGINS if set
if [[ -n "${ALLOWED_ORIGINS:-}" ]]; then
  log "Injecting ALLOWED_ORIGINS"
  # Replace empty ALLOWED_ORIGINS with the value
  sed -i "s|^ALLOWED_ORIGINS = \"\"|ALLOWED_ORIGINS = \"$ALLOWED_ORIGINS\"|" "$WRANGLER_TEMP"
fi

# Inject cache TTL overrides if set
if [[ -n "${STELLAR_TOML_MAX_AGE:-}" ]]; then
  log "Injecting STELLAR_TOML_MAX_AGE=$STELLAR_TOML_MAX_AGE"
  sed -i "s|^STELLAR_TOML_MAX_AGE = \".*\"|STELLAR_TOML_MAX_AGE = \"$STELLAR_TOML_MAX_AGE\"|" "$WRANGLER_TEMP"
fi

if [[ -n "${DEFAULT_MAX_AGE:-}" ]]; then
  log "Injecting DEFAULT_MAX_AGE=$DEFAULT_MAX_AGE"
  sed -i "s|^DEFAULT_MAX_AGE = \".*\"|DEFAULT_MAX_AGE = \"$DEFAULT_MAX_AGE\"|" "$WRANGLER_TEMP"
fi

# Add environment-specific route pattern
if [[ "$ENVIRONMENT" == "staging" ]]; then
  log "Configuring staging routes"
  sed -i 's|zone_name = "yourdomain.com"|zone_name = "staging.yourdomain.com"|' "$WRANGLER_TEMP"
fi

# Validate wrangler.toml
log "Validating wrangler configuration"
if ! wrangler deploy --config "$WRANGLER_TEMP" --dry-run 2>/dev/null; then
  warn "Dry run failed — check wrangler.toml syntax"
fi

# Deploy
log "Deploying to $ENVIRONMENT"
wrangler deploy --config "$WRANGLER_TEMP" --env "$ENVIRONMENT"

# Cleanup
rm -f "$WRANGLER_TEMP"
log "Deployment complete! Cleaned up temporary config."
