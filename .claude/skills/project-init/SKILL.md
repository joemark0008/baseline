---
name: project-init
description: Turn a fresh clone of this boilerplate into a named project - rename the placeholder, provision its database in shared-postgres, create the api and web resources in Coolify, deploy, and verify the live URLs.
---

# /project-init <project-name> [subdomain]

Run this once, right after cloning the boilerplate into `/root/project/<project-name>/`.
It follows the root `CLAUDE.md` deployment rules exactly; read that file first.

## Steps

1. **Rename** – run `scripts/init.sh <project-name> --provision` from the project root.
   It replaces `his-project-planner` everywhere, writes `.env.example`, initialises git, creates
   the Postgres role + database in `shared-postgres`, and prints the env vars to set. Capture the
   printed `DATABASE_URL` and `BETTER_AUTH_SECRET`; never write them into files.
2. **Check the subdomains are free** – `GET /api/v1/applications` and make sure no `fqdn`
   already uses `<slug>.joemarkgimeno.com` or `<slug>-api.joemarkgimeno.com`.
3. **Create the API resource** in project `dev-projects` / environment `development`:
   `POST /api/v1/applications/dockerfile` (or `/public` with `build_pack: dockerfile` once the
   repo is pushed) with `name: <project-name>-api`, `dockerfile_location: apps/api/Dockerfile`,
   `base_directory: /`, `ports_exposes: 3001`, `domains: https://<slug>-api.joemarkgimeno.com`.
   Then `POST /api/v1/applications/{uuid}/envs` for every variable in `.env.example`'s api block
   with real values (`NODE_ENV=production`, `PORT=3001`, `DATABASE_URL`, `BETTER_AUTH_SECRET`,
   `BETTER_AUTH_URL`, `WEB_ORIGINS`, `COOKIE_DOMAIN`). No admin credentials go into env vars.
4. **Create the web resource** the same way with `name: <project-name>`,
   `dockerfile_location: apps/web/Dockerfile`, `ports_exposes: 80`,
   `domains: https://<slug>.joemarkgimeno.com`, and build-time env
   `VITE_API_URL=https://<slug>-api.joemarkgimeno.com` (mark it as a build variable).
5. **Deploy both** (`POST /api/v1/deploy?uuid=...`) and wait for `finished`.
6. **Hand over first-run setup** – read the setup token from the API container log
   (`Setup token: …`; reissue with `docker exec <api-container> npm run setup:token:prod`) and
   give the user the setup URL `https://<slug>.joemarkgimeno.com/setup` and the token. The user
   creates the admin there; never create it for them.
7. **Verify** – `curl -I https://<slug>-api.joemarkgimeno.com/health` returns 200 and
   `curl -I https://<slug>.joemarkgimeno.com/setup` returns the app. Report both URLs to the
   user.

8. **Local development (optional)** – for work on this machine, create a local role + database
   named after the project and a root `.env` as described in README → Local development.

## Notes

- Do not publish ports on the host; only `ports_exposes`.
- Never create a new Postgres resource; the script already provisioned the shared one.
- If `init.sh` was already run without `--provision`, run the provisioning block from the root
  `CLAUDE.md` section 5 by hand.
