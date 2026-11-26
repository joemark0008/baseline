#!/usr/bin/env sh
# Turn this boilerplate into a named project.
#
#   scripts/init.sh <project-name> [--domain <root>] [--subdomain <name>] [--provision] [--no-git]
#
# 1. Replaces the placeholder "his-project-planner" (and "his_project_planner" for DB names)
#    with <project-name> in every tracked text file, and removes boilerplate-only blocks.
# 2. Writes .env.example with the derived URL https://<name>.<root> (web and API share one origin:
#    nginx in the web image proxies /graphql and /api/ to the api container, so there is no -api subdomain;
#    --domain defaults to joemarkgimeno.com, the Coolify server's domain).
# 3. Initialises a fresh git repository (unless --no-git).
# 4. With --provision (only on the Coolify server with the shared Postgres from the root CLAUDE.md):
#    creates the database + role in shared-postgres and prints the env vars to set on the api.
#    Elsewhere, create the database yourself and set the env vars on your host (README → Deployment).
#
# Only POSIX sh + sed + find are required (Linux or macOS); Node is NOT needed on the host.
set -eu

PLACEHOLDER="his-project-planner"
PLACEHOLDER_DB="his_project_planner"
ROOT_DOMAIN="joemarkgimeno.com"
SHARED_PG_CONTAINER="yffa7j63cyfnqtfalg4wstj7"

usage() { sed -n '2,16p' "$0"; exit 1; }
# In-place edit that works with both GNU sed (Linux) and BSD sed (macOS), whose -i differ.
# cp -p keeps the file's permissions (e.g. the executable bit). mv replaces the file rather than
# rewriting it, which matters because this script edits itself while the shell is reading it.
sed_i() {
  _f="$1"; shift
  _t=$(mktemp)
  cp -p "$_f" "$_t" && sed "$@" "$_f" > "$_t" && mv "$_t" "$_f"
}
[ $# -ge 1 ] || usage

NAME=""
PROVISION=0
DO_GIT=1
SUBDOMAIN=""
while [ $# -gt 0 ]; do
  case "$1" in
    --provision) PROVISION=1 ;;
    --no-git) DO_GIT=0 ;;
    --subdomain) shift; SUBDOMAIN="$1" ;;
    --domain) shift; ROOT_DOMAIN="$1" ;;
    -h|--help) usage ;;
    *) NAME="$1" ;;
  esac
  shift
done

[ -n "$NAME" ] || usage
# subdomain rule from CLAUDE.md: lowercase, letters/digits/hyphens only, single level
SLUG=$(printf '%s' "${SUBDOMAIN:-$NAME}" | tr '[:upper:]_' '[:lower:]-' | sed 's/[^a-z0-9-]//g')
DB=$(printf '%s' "$NAME" | tr '[:upper:]-' '[:lower:]_' | sed 's/[^a-z0-9_]//g')
[ -n "$SLUG" ] || { echo "invalid project name" >&2; exit 1; }

cd "$(dirname "$0")/.."

echo "project:   $NAME"
echo "web:       https://$SLUG.$ROOT_DOMAIN"
echo "api:       https://$SLUG.$ROOT_DOMAIN/graphql (proxied by the web container)"
echo "database:  $DB (role $DB)"

# 1. rename placeholder in tracked text files (skip generated/vendored trees)
find . -type f \
  ! -path './.git/*' ! -path '*/node_modules/*' ! -path '*/dist/*' \
  ! -path './apps/api/src/generated/*' ! -path './apps/web/src/graphql/codegen/*' \
  ! -name '*.png' ! -name '*.ico' ! -name '*.jpg' \
  -exec grep -Il -e "$PLACEHOLDER" -e "$PLACEHOLDER_DB" {} + 2>/dev/null | while read -r f; do
    sed_i "$f" "s/$PLACEHOLDER_DB/$DB/g; s/$PLACEHOLDER/$SLUG/g"
  done
# drop guidance that only applies to the boilerplate repository itself
for f in CLAUDE.md README.md; do
  [ -f "$f" ] && sed_i "$f" '/<!-- boilerplate-only:start/,/<!-- boilerplate-only:end -->/d'
done
# the boilerplate's own Spec Kit feature history does not belong to the new project
rm -rf specs
# the npm package scope (package.json files and the lock's workspace entries) uses the project name verbatim
for f in package.json package-lock.json apps/*/package.json; do
  if [ -f "$f" ]; then sed_i "$f" "s/@$SLUG\//@$DB\//g"; fi
done

# 2. .env.example with derived URLs (secrets stay placeholders)
sed_i .env.example \
  -e "s|^BETTER_AUTH_URL=.*|BETTER_AUTH_URL=https://$SLUG.$ROOT_DOMAIN|" \
  -e "s|^WEB_ORIGINS=.*|WEB_ORIGINS=https://$SLUG.$ROOT_DOMAIN|" \
  -e "s|^COOKIE_DOMAIN=.*|COOKIE_DOMAIN=|" \
  -e "s|^VITE_API_URL=.*|VITE_API_URL=https://$SLUG.$ROOT_DOMAIN|"

# 3. fresh git history
if [ "$DO_GIT" -eq 1 ] && [ ! -d .git ]; then
  git init -q -b main
  git add -A
  git -c user.name=init -c user.email=init@localhost commit -q -m "chore: scaffold $NAME from speckit boilerplate"
  echo "git:       initialised (1 commit on main)"
fi

# 4. optional provisioning on the Coolify host
if [ "$PROVISION" -eq 1 ]; then
  command -v docker >/dev/null || { echo "docker not found; cannot provision" >&2; exit 1; }
  PW=$(openssl rand -hex 24)
  docker exec "$SHARED_PG_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 \
    -c "CREATE ROLE $DB LOGIN NOSUPERUSER NOCREATEROLE CREATEDB PASSWORD '$PW'" \
    -c "CREATE DATABASE $DB OWNER $DB"
  echo
  echo "Set these env vars on the api (password shown once):"
  echo "  DATABASE_URL=postgres://$DB:$PW@$SHARED_PG_CONTAINER:5432/$DB"
  echo "  BETTER_AUTH_SECRET=$(openssl rand -hex 32)"
  echo "  BETTER_AUTH_URL=https://$SLUG.$ROOT_DOMAIN"
  echo "  WEB_ORIGINS=https://$SLUG.$ROOT_DOMAIN"
  echo "  COOKIE_DOMAIN=   (empty: single origin, host-only cookie)"
  echo "and on the web (build args): VITE_API_URL=https://$SLUG.$ROOT_DOMAIN"
fi

echo
echo "Done. Next: deploy (on Coolify: /project-init in Claude Code; elsewhere: README → Deployment),"
echo "then /speckit-specify for the first feature."
