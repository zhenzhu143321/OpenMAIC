# OpenMAIC Agent Notes

## 8002 Service Startup

- Project root: `/home/sunli/MyWork/myproject/OpenMAIC`
- The production-style `8002` service uses the Next.js standalone build.
- Do not use `pnpm start` for the `8002` service.

Use this preferred detached startup command:

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
tmux new-session -d -s openmaic-svc-8002 './scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1'
```

## Verify

```bash
ss -ltnp 'sport = :8002'
curl http://127.0.0.1:8002/api/health
curl http://127.0.0.1:8002/api/classroom
```

## Stop

```bash
tmux kill-session -t openmaic-svc-8002
```

## Rebuild Before Restart

If server-side code changed, rebuild before restarting:

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
pnpm build
tmux kill-session -t openmaic-svc-8002 || true
tmux new-session -d -s openmaic-svc-8002 './scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1'
```

## Important Pitfalls

- `node .next/standalone/server.js` changes `process.cwd()` to `.next/standalone`.
- Server-side storage must resolve back to the repo root, not the standalone snapshot directory.
- On this host, shell `HOSTNAME` may point to a machine hostname such as `k8s-node3-gpu`; if passed through unchanged, Next.js may bind to `127.0.1.1` instead of `0.0.0.0`.
- `./scripts/start-8002.sh` is the safe entry because it sets `OPENMAIC_PROJECT_ROOT`, `PORT`, and a safe `HOSTNAME`.
