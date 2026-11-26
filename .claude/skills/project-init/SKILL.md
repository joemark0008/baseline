---
name: project-init
description: Turn a fresh clone of this boilerplate into a named project - rename the placeholder, provision its database in shared-postgres, create one Coolify resource (api + web containers behind a single domain), deploy, and verify the live URL.
---

# /project-init <project-name> [subdomain]

Run this once, right after cloning the boilerplate into `/root/project/<project-name>/`.
It follows the root `CLAUDE.md` deployment rules exactly; read that file first.

The project is **one domain**: `https://<slug>.joemarkgimeno.com`. The web container (nginx) serves
the SPA and proxies `/graphql` and `/api/` to the api container (`apps/web/nginx.conf`), so there
is no `-api` subdomain, no CORS and no cross-subdomain cookie. Both containers are deployed as one
Coolify resource so nginx can reach the api by its compose service name `api`.

## Steps

1. **Rename** – run `scripts/init.sh <project-name> --provision` from the project root.
   It replaces `his-project-planner` everywhere (including `package-lock.json`'s workspace
   names), writes `.env.example`, initialises git, creates the Postgres role + database in
   `shared-postgres`, and prints the env vars to set. Capture the printed `DATABASE_URL` and
   `BETTER_AUTH_SECRET`; never write them into files. If `npm ci` later fails with "Missing:
   @<db>/api from lock file", the lock still holds the old names: `sed` them and commit.
2. **Check the subdomain is free** – `GET /api/v1/applications` and `GET /api/v1/services`;
   no `fqdn` may already use `<slug>.joemarkgimeno.com`.
3. **Build the two images on the host** from the repository root (README → Deployment):
   ```sh
   docker build -f apps/api/Dockerfile -t <project-name>-api:latest .
   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://<slug>.joemarkgimeno.com \
     -t <project-name>-web:latest .
   ```
   `VITE_API_URL` is the **web** URL (same origin). Run the builds in the background; they take
   several minutes.
4. **Create the Coolify resource** – `POST /api/v1/services` in project `dev-projects` /
   environment `development`, `name: <project-name>`, `connect_to_docker_network: true`,
   `instant_deploy: false`, `urls: [{name: "web", url: "https://<slug>.joemarkgimeno.com"}]`
   (only `web` gets a domain), and `docker_compose_raw` = base64 of:
   ```yaml
   services:
     api:
       image: <project-name>-api:latest
       pull_policy: never
       environment:
         - NODE_ENV=production
         - PORT=3001
         - DATABASE_URL=${DATABASE_URL}
         - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
         - BETTER_AUTH_URL=https://<slug>.joemarkgimeno.com
         - WEB_ORIGINS=https://<slug>.joemarkgimeno.com
         - CLIENT_IP_HEADERS=cf-connecting-ip,x-forwarded-for
         - TZ=Asia/Manila
       expose: ["3001"]
       restart: unless-stopped
     web:
       image: <project-name>-web:latest
       pull_policy: never
       expose: ["80"]
       depends_on: [api]
       restart: unless-stopped
   ```
   `COOKIE_DOMAIN` stays unset (host-only cookie). No `ports:`; the proxy routes to `expose`.
   Then `PATCH /api/v1/services/{uuid}/envs/bulk` with `DATABASE_URL` and `BETTER_AUTH_SECRET`
   (`is_shown_once: true`). No admin credentials go into env vars.
5. **Deploy** – once both builds succeeded, `POST /api/v1/deploy?uuid=<service-uuid>` and wait
   until `docker inspect api-<uuid>` and `web-<uuid>` report `healthy`.
6. **Hand over first-run setup** – read the setup token from the api container log
   (`docker logs api-<uuid>`, line `Setup token: …`; reissue with
   `docker exec api-<uuid> npm run setup:token:prod`) and give the user the setup URL
   `https://<slug>.joemarkgimeno.com/setup` and the token. The user creates the admin there;
   never create it for them.
7. **Verify** – all of these must return 200 through the proxy:
   `https://<slug>.joemarkgimeno.com/`, `/setup`, `/health`, `/api/auth/ok`, and a
   `POST /graphql` with `{"query":"{ __typename }"}`. Report the live URL to the user.

8. **Local development (optional)** – for work on this machine, create a local role + database
   named after the project and a root `.env` as described in README → Local development.

## Shipping a change

Rebuild the affected image(s) with the commands in step 3, then redeploy the service
(`POST /api/v1/deploy?uuid=<service-uuid>`). The web image must be rebuilt for any change to
`VITE_*` values or `nginx.conf`.

## Notes

- Do not publish ports on the host; only `expose`.
- Never create a new Postgres resource; the script already provisioned the shared one.
- If `init.sh` was already run without `--provision`, run the provisioning block from the root
  `CLAUDE.md` section 5 by hand.
- Git-based alternative: if the repo is pushed to GitHub with Coolify's deploy key added, the
  same compose can be a Coolify **Docker Compose application** built from the repo instead of
  host-built images. Keep the single-domain layout either way; two separate Coolify
  applications cannot share a domain because nginx could not resolve `api`.
