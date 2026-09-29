#!/usr/bin/env bash
# Generates server/supabase/docker/.env from .env.example with real random secrets
# and legacy HS256 API keys, plus CareerPath-specific settings.
#
# Safety properties:
#   - API JWTs are minted AGAINST the JWT_SECRET read back from the generated
#     file itself, so signature and secret are definitionally consistent.
#   - The script self-verifies both keys at the end and exits non-zero on any
#     mismatch instead of leaving a broken .env behind.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_EXAMPLE="$SCRIPT_DIR/supabase/docker/.env.example"
ENV_OUT="$SCRIPT_DIR/supabase/docker/.env"

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "ERROR: $ENV_EXAMPLE not found" >&2
  exit 1
fi
if [ -f "$ENV_OUT" ]; then
  echo "Refusing to overwrite existing $ENV_OUT (delete it first to regenerate)" >&2
  exit 1
fi

cp "$ENV_EXAMPLE" "$ENV_OUT"

# ---------- random helpers ----------
b64()  { openssl rand -base64 48 | tr -d '\n'; }
hex()  { openssl rand -hex "$1"; }
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

# ---------- apply ----------
apply() { sed -i "s|^$1=.*|$1=$2|" "$ENV_OUT"; }

# ---------- 1. JWT_SECRET: write it to the file FIRST ----------
JWT_SECRET="$(b64 | tr '+/' '-_' | tr -d '=')"
apply JWT_SECRET "$JWT_SECRET"

# ---------- 2. mint JWTs using the secret READ BACK FROM THE FILE ----------
read_secret_from_file() {
  grep -E '^JWT_SECRET=' "$ENV_OUT" | head -1 | cut -d= -f2-
}

mint_jwt() {  # $1 = role
  local role="$1" sec now exp header payload signing_input sig
  sec="$(read_secret_from_file)"
  now="$(date +%s)"; exp="$(( now + 315360000 ))"  # +10 years
  header='{"alg":"HS256","typ":"JWT"}'
  payload='{"role":"'"$role"'","iss":"supabase-demo","iat":'"$now"',"exp":'"$exp"'}'
  signing_input="$(printf '%s' "$header" | b64url).$(printf '%s' "$payload" | b64url)"
  sig="$(printf '%s' "$signing_input" | openssl dgst -sha256 -hmac "$sec" -binary | b64url)"
  printf '%s.%s' "$signing_input" "$sig"
}

ANON_KEY="$(mint_jwt anon)"
SERVICE_KEY="$(mint_jwt service_role)"

apply ANON_KEY                 "$ANON_KEY"
apply SERVICE_ROLE_KEY         "$SERVICE_KEY"
apply SUPABASE_PUBLISHABLE_KEY "$ANON_KEY"
apply SUPABASE_SECRET_KEY      "$SERVICE_KEY"

# ---------- 3. everything else ----------
apply POSTGRES_PASSWORD        "$(hex 16)"
apply DASHBOARD_USERNAME       "admin"
apply DASHBOARD_PASSWORD       "$(hex 16)"
apply SECRET_KEY_BASE          "$(b64)"
apply REALTIME_DB_ENC_KEY      "$(hex 8)"
# VAULT_ENC_KEY must be EXACTLY 32 chars (16 hex bytes) - Supavisor crashes otherwise
apply VAULT_ENC_KEY            "$(hex 16)"
apply PG_META_CRYPTO_KEY       "$(hex 24)"
apply LOGFLARE_PUBLIC_ACCESS_TOKEN  "$(hex 24)"
apply LOGFLARE_PRIVATE_ACCESS_TOKEN "$(hex 24)"
apply S3_PROTOCOL_ACCESS_KEY_ID      "$(hex 16)"
apply S3_PROTOCOL_ACCESS_KEY_SECRET  "$(hex 32)"
apply MINIO_ROOT_PASSWORD      "$(hex 16)"
apply POOLER_TENANT_ID         "careerpath-$(hex 8)"

# CareerPath-specific
apply SITE_URL                 "${SITE_URL:-https://career-path-neon.vercel.app}"
apply SUPABASE_PUBLIC_URL      "${SUPABASE_PUBLIC_URL:-https://REPLACE-WITH-YOUR-SUPABASE-TUNNEL-URL}"
apply API_EXTERNAL_URL         "${SUPABASE_PUBLIC_URL:-https://REPLACE-WITH-YOUR-SUPABASE-TUNNEL-URL}/auth/v1"

# ---------- 4. self-verify: signature consistency AND payload validity ----------
b64url_decode() {
  local s="$1"
  s="$(printf '%s' "$s" | tr '_-' '/+')"
  case $(( ${#s} % 4 )) in 2) s="${s}==";; 3) s="${s}=";; esac
  printf '%s' "$s" | openssl base64 -d -A 2>/dev/null
}

verify_key() {  # $1 = env var name of the JWT, $2 = expected role
  local key h p sig sec expected decoded
  key="$(grep -E "^$1=" "$ENV_OUT" | head -1 | cut -d= -f2-)"
  h="$(printf '%s' "$key" | cut -d. -f1)"
  p="$(printf '%s' "$key" | cut -d. -f2)"
  sig="$(printf '%s' "$key" | cut -d. -f3)"
  sec="$(read_secret_from_file)"
  expected="$(printf '%s' "$h.$p" | openssl dgst -sha256 -hmac "$sec" -binary | b64url)"
  if [ "$sig" != "$expected" ]; then
    echo "SELF-VERIFY FAILED for $1 (signature inconsistent with JWT_SECRET)" >&2
    return 1
  fi
  decoded="$(b64url_decode "$p")"
  if ! printf '%s' "$decoded" | grep -q "{\"role\":\"$2\"" || \
     ! printf '%s' "$decoded" | grep -q '"iat":[0-9]'; then
    echo "SELF-VERIFY FAILED for $1 (payload is not valid JSON with numeric iat): $decoded" >&2
    return 1
  fi
}

if verify_key ANON_KEY anon && verify_key SERVICE_ROLE_KEY service_role; then
  VERIFY_STATUS="OK"
else
  rm -f "$ENV_OUT"
  echo "Generated .env failed signature self-check and has been deleted. Re-run this script." >&2
  exit 1
fi

chmod 600 "$ENV_OUT"

echo "=============================================================="
echo " server/supabase/docker/.env generated  (signature check: $VERIFY_STATUS)"
echo "=============================================================="
echo " ANON_KEY         = $ANON_KEY"
echo " SERVICE_ROLE_KEY = $SERVICE_KEY"
echo ""
echo " >>> Copy ANON_KEY into Vercel as NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo " >>> After tunnels start, edit SUPABASE_PUBLIC_URL and API_EXTERNAL_URL"
echo "     to the real tunnel URL, then: docker compose up -d"
echo "=============================================================="
