# OpenMAIC Agent Notes

## Canonical Paths

- Project root: `/home/sunli/MyWork/myproject/OpenMAIC`
- Internal service URL: `http://127.0.0.1:8002`
- LAN URL (current host): `http://172.16.29.100:8002`
- External reverse-tunnel URL (when tunnel is running): `http://182.92.78.182:38002`

## 8002 Service Startup

The production-style `8002` service uses the **Next.js standalone build**.

**Do not use `pnpm start` for the 8002 service.**

Preferred detached startup:

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
tmux new-session -d -s openmaic-svc-8002 './scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1'
```

The helper script safely:
- sets `OPENMAIC_PROJECT_ROOT`
- binds `HOSTNAME=0.0.0.0`
- loads `.env.local`
- copies `.next/static` and `public/` into `.next/standalone/`

## Verify

```bash
ss -ltnp 'sport = :8002'
curl http://127.0.0.1:8002/api/health
```

Useful smoke checks:

```bash
curl -I http://127.0.0.1:8002/login
curl -I http://127.0.0.1:8002/classroom/<classroomId>
```

## Stop / Restart

```bash
tmux kill-session -t openmaic-svc-8002
```

If server-side code changed, rebuild before restart:

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
pnpm build
tmux kill-session -t openmaic-svc-8002 || true
tmux new-session -d -s openmaic-svc-8002 './scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1'
```

## Published Classroom Media Repair

If a published/server classroom loads but images or audio return `404`, backfill missing server media from classroom metadata:

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
node scripts/backfill-classroom-media.mjs <classroomId>
```

Then re-test:

```bash
curl -I "http://127.0.0.1:8002/api/classroom/media?id=<classroomId>&file=<fileName>"
```

## Important Pitfalls

- `node .next/standalone/server.js` changes `process.cwd()` to `.next/standalone`; storage must resolve back to repo root.
- On this host, inherited shell `HOSTNAME` may bind Next.js to `127.0.1.1`; `start-8002.sh` forces a safe host.
- Standalone mode does **not** auto-load `.env.local`; the helper script does.
- The auth system is now always-on for non-public routes. Health checks stay public; most pages/API routes require login.
