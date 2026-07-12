# Deployment — Runbook API + Frontend

How production deploy works for **runbook** (API) and **runbook_front** (SvelteKit), and how this VPS was set up.

| Piece | Value |
|-------|--------|
| VPS | `root@89.116.26.246` (`vmi2940510`) |
| API path | `/var/www/runbook` |
| Front path | `/var/www/runbook_front` |
| Public API | https://api.devl0pr.com |
| Public site | https://devl0pr.com |
| API process | Docker Compose on host `:8090` |
| Front process | systemd `runbook-front` on host `:3000` |
| Reverse proxy | nginx + Let’s Encrypt |

---

## How deploy works (day to day)

```text
git push origin main
        │
        ▼
GitHub Actions  (.github/workflows/deploy.yml)
        │  SSH with secrets VPS_*
        ▼
VPS: cd /var/www/<app> && ./bin/deploy.sh
        │
        ├── git fetch + reset --hard origin/main
        ├── rebuild (Docker or npm)
        └── restart / migrate / cache
```

- Push to **`main`** on `etercode/runbook` → deploys the API only.
- Push to **`main`** on `etercode/runbook_front` → deploys the frontend only.
- Watch runs: repo **Actions** tab, or `gh run list -R etercode/runbook`.

### What each `deploy.sh` does

**API** (`runbook/bin/deploy.sh`):

1. Requires `.env.local`
2. `git fetch origin main` + `git reset --hard origin/main`
3. `docker compose --env-file .env.local -f compose.yaml -f compose.prod.yaml up -d --build`
4. Wait for Postgres healthy
5. `doctrine:migrations:migrate`
6. Prod cache clear + warmup

**Front** (`runbook_front/bin/deploy.sh`):

1. Requires `.env` with `VITE_API_URL` (baked in at build time)
2. Same git reset to `origin/main`
3. `npm ci` → `npm run build`
4. `systemctl restart runbook-front` (or pm2)

Manual deploy on the VPS (same scripts Actions run):

```bash
ssh root@89.116.26.246
cd /var/www/runbook && ./bin/deploy.sh
cd /var/www/runbook_front && ./bin/deploy.sh
```

---

## GitHub Actions secrets

Same four secrets on **both** repos (`Settings → Secrets and variables → Actions`):

| Secret | Example / meaning |
|--------|-------------------|
| `VPS_HOST` | `89.116.26.246` |
| `VPS_USER` | `root` |
| `VPS_PORT` | `22` |
| `VPS_SSH_KEY` | Private key for Actions → VPS (`/root/.ssh/github_actions_deploy` on the server) |

Workflow files:

- `runbook/.github/workflows/deploy.yml` → `cd /var/www/runbook && ./bin/deploy.sh`
- `runbook_front/.github/workflows/deploy.yml` → `cd /var/www/runbook_front && ./bin/deploy.sh`

---

## One-time setup (what we did)

### 1. SSH access from the laptop (no password)

On the laptop, public key `~/.ssh/id_ed25519.pub` was installed into the VPS `authorized_keys` (one-time password login). After that:

```bash
ssh -i ~/.ssh/id_ed25519 root@89.116.26.246
```

### 2. Keys on the VPS for GitHub Actions

Generated on the VPS:

| Key | Purpose |
|-----|---------|
| `/root/.ssh/github_actions_deploy` | Actions SSHs into the VPS (public key in `authorized_keys`; **private** key → GitHub secret `VPS_SSH_KEY`) |
| (earlier) repo deploy keys | Not used long-term — fine-grained PAT lacked deploy-key permission |

### 3. GitHub auth for `git pull` on the VPS

VPS clones use **HTTPS** with a stored credential:

```bash
# on VPS — token with Contents: Read (and Write if you push from server)
printf 'https://x-access-token:YOUR_PAT@github.com\n' > /root/.git-credentials
chmod 600 /root/.git-credentials
git config --global credential.helper store
```

The PAT must include at least **Contents: Read** on both repos for pull; **Contents: Write** was needed from the laptop to push workflows. Secrets API needed **Secrets** permission (already worked).

### 4. Clone apps

```bash
git clone https://github.com/etercode/runbook.git /var/www/runbook
git clone https://github.com/etercode/runbook_front.git /var/www/runbook_front
```

### 5. API production env

Created `/var/www/runbook/.env.local` (not in git), roughly:

```env
APP_ENV=prod
APP_SECRET=<random>
POSTGRES_DB=runbook
POSTGRES_USER=app
POSTGRES_PASSWORD=<random>
DATABASE_URL="postgresql://app:<password>@database:5432/runbook?serverVersion=18&charset=utf8"
MCP_AUTHOR_EMAIL=admin@runbook.local
DEFAULT_URI=https://api.devl0pr.com
CORS_ALLOWED_ORIGINS=https://devl0pr.com,https://www.devl0pr.com
```

Compose **must** load this file for variable interpolation:

```bash
docker compose --env-file .env.local -f compose.yaml -f compose.prod.yaml up -d --build
```

(`bin/deploy.sh` already passes `--env-file .env.local`.)

### 6. Frontend production env + Node + systemd

- Installed **Node 22** on the VPS (NodeSource).
- `/var/www/runbook_front/.env`:

  ```env
  VITE_API_URL=https://api.devl0pr.com
  ```

- Unit from `deploy/runbook-front.service` → `/etc/systemd/system/runbook-front.service`  
  (`PORT=3000`, `HOST=127.0.0.1`, `ExecStart=node …/build`).
- `systemctl enable --now runbook-front`

### 7. nginx + TLS

- **api.devl0pr.com** → `127.0.0.1:8090` (cert via certbot).
- **devl0pr.com** / **www** → `127.0.0.1:3000` (existing Let’s Encrypt cert).  
  Previous static config backed up as `devl0pr.com.static.bak`.

DNS already pointed `api.devl0pr.com` and `devl0pr.com` at the VPS.

### 8. First boot fixes worth remembering

- **Twig in prod:** `config/packages/twig.yaml` was loading Twig without the bundle in `--no-dev` images. Wrapped under `when@dev` / `when@test`.
- **Dirty tree on first Actions run:** files had been copied onto the VPS before they existed on GitHub, so `git pull` failed. Fixed by `git reset --hard origin/main`, and deploys now always **reset hard** to `origin/main` (server-only files like `.env.local` stay because they are untracked / gitignored).

### 9. Wire Actions secrets + push workflows

```bash
# example — private key from VPS into both repos
gh secret set VPS_HOST -R etercode/runbook -b '89.116.26.246'
gh secret set VPS_USER -R etercode/runbook -b 'root'
gh secret set VPS_PORT -R etercode/runbook -b '22'
gh secret set VPS_SSH_KEY -R etercode/runbook < /path/to/github_actions_deploy
# same for etercode/runbook_front
```

Then push `.github/workflows/deploy.yml` (and front `bin/deploy.sh` + systemd unit) to `main`.

---

## Layout on the VPS

```text
/var/www/runbook/          # API git checkout
  .env.local               # prod secrets (never commit)
  bin/deploy.sh
  compose.yaml + compose.prod.yaml

/var/www/runbook_front/    # Front git checkout
  .env                     # VITE_API_URL
  bin/deploy.sh
  build/                   # adapter-node output
  deploy/runbook-front.service

/etc/systemd/system/runbook-front.service
/etc/nginx/sites-enabled/api.devl0pr.com
/etc/nginx/sites-enabled/devl0pr.com
/root/.ssh/github_actions_deploy[.pub]
/root/.git-credentials     # HTTPS PAT for git fetch
```

---

## Ops cheat sheet

| Task | Command |
|------|---------|
| API logs | `docker compose --env-file .env.local -f compose.yaml -f compose.prod.yaml logs -f` |
| Front logs | `journalctl -u runbook-front -f` |
| Restart front | `systemctl restart runbook-front` |
| DB backup | `cd /var/www/runbook && ./bin/backup-db.sh` |
| Create admin | `docker compose --env-file .env.local -f compose.yaml -f compose.prod.yaml exec php php bin/console app:user:create EMAIL 'PASS' --name 'Admin' --admin` |
| Re-run last Action | Actions tab → failed/success run → **Re-run jobs** |

Health checks:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://api.devl0pr.com/api/posts
curl -sS -o /dev/null -w '%{http_code}\n' https://devl0pr.com/
```

---

## Security notes

- Do not commit `.env.local`, `.env`, PATs, or private SSH keys.
- Rotate any password or token that was shared in chat or stored in a plain file on the laptop.
- Prefer a deploy-only SSH key (`github_actions_deploy`) for Actions; keep personal laptop keys separate.
- Fine-grained PAT on the VPS: Contents Read is enough for deploy pulls; revoke unused scopes.
