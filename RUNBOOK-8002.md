# OpenMAIC 8002 Runbook

## Scope

This runbook is for the long-running OpenMAIC service on **port 8002**.

- Repo root: `/home/sunli/MyWork/myproject/OpenMAIC`
- Internal URL: `http://127.0.0.1:8002`
- LAN URL: `http://172.16.29.100:8002`
- Optional external reverse tunnel: `http://182.92.78.182:38002`

The service uses the **Next.js standalone build**. Do **not** manage it with `pnpm start`.

---

## 1. Build

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
pnpm build
```

If dependency installation or build needs a proxy on this host:

```bash
export http_proxy="http://127.0.0.1:17891"
export https_proxy="http://127.0.0.1:17891"
```

---

## 2. Start

### Foreground start

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
./scripts/start-8002.sh
```

### Detached start with tmux

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
tmux new-session -d -s openmaic-svc-8002 './scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1'
```

`start-8002.sh` handles the standalone-specific requirements:
- exports `OPENMAIC_PROJECT_ROOT`
- binds `HOSTNAME=0.0.0.0`
- loads `.env.local`
- copies `.next/static` and `public/` into `.next/standalone/`
- launches `.next/standalone/server.js`

---

## 3. Verify

### Process / port

```bash
ss -ltnp 'sport = :8002'
tmux ls | grep openmaic-svc-8002
```

### Health check

```bash
curl http://127.0.0.1:8002/api/health
```

Expected:

```json
{"success":true,"status":"ok","version":"0.1.0"}
```

### Basic HTTP smoke checks

```bash
curl -I http://127.0.0.1:8002/login
curl -I http://127.0.0.1:8002/register
curl -I http://127.0.0.1:8002/classroom/<classroomId>
```

Notes:
- `/login` and `/register` should open without authentication.
- most other pages should redirect unauthenticated users to `/login?from=...`.

---

## 4. Logs

Detached startup writes to:

```bash
/tmp/openmaic-8002.log
```

Useful commands:

```bash
tail -f /tmp/openmaic-8002.log
grep -n "ERROR\|Failed\|Unhandled" /tmp/openmaic-8002.log
```

---

## 5. Stop / Restart

### Stop

```bash
tmux kill-session -t openmaic-svc-8002
```

### Restart after server-side change

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
pnpm build
tmux kill-session -t openmaic-svc-8002 || true
tmux new-session -d -s openmaic-svc-8002 './scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1'
```

---

## 6. Auth-specific Notes

OpenMAIC now has built-in authentication and role permissions.

Required/public behavior:
- `/api/health` stays public
- `/login` and `/register` stay public
- most other pages and APIs require login

Relevant env vars in `.env.local`:

```env
AUTH_SECRET=<openssl rand -hex 32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<set a real password>
AUTH_COOKIE_SECURE=false   # set when serving over plain HTTP
```

If `ADMIN_PASSWORD` is blank and `data/users/` is empty, bootstrap admin login will fail.

---

## 7. Published Classroom Media Repair

If a classroom page opens but server media returns `404`, backfill missing assets from the classroom metadata:

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
node scripts/backfill-classroom-media.mjs <classroomId>
```

Re-check the media endpoint:

```bash
curl -I "http://127.0.0.1:8002/api/classroom/media?id=<classroomId>&file=<fileName>"
```

---

## 8. Common Pitfalls

1. **Do not use `pnpm start` for 8002**
   - the deployed service is based on standalone output, not `next start`

2. **Do not rely on `process.cwd()` in standalone mode**
   - `server.js` runs inside `.next/standalone`
   - storage must resolve back to the repo root

3. **Do not trust inherited `HOSTNAME` on this host**
   - some shells expose a machine hostname that makes Next.js bind to `127.0.1.1`
   - `start-8002.sh` forces a safe host binding

4. **Remember to rebuild after server-side code changes**
   - route handlers, storage code, middleware, and server helpers require a fresh standalone build
