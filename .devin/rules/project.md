---
trigger: always_on
---

# Project environment and verification

- This is a React 19 / Vite 8 application using Firebase Auth and Three.js. Use Node 22.17 or newer compatible Node 22 LTS.
- Frontend: `npm run dev` on port 5173. Production frontend: `npm run build`. If another app owns 5173, do not stop it: use `npm run dev -- --host 127.0.0.1 --port 5180` and include `http://127.0.0.1:5180` in the game server's ANDIN_ORIGINS.
- Existing whole-project `npm run lint` has unrelated legacy errors; do not disable lint rules to conceal them. Verify the game with `npm run lint:andin`.
- Game simulation, socket integration, and storage tests: `npm run test:andin`.
- Browser verification: install Chromium with `npx playwright install chromium`, then run `npm run test:andin:browser`. Tests start isolated in-memory backend/Vite servers and create only local test identities. Screenshots are generated under `.andin-test-artifacts/`.

# andin-multiplayer runtime

- Shared maps and gameplay constants live in `shared/andin/world.js`. Simulation and validation are server-authoritative under `server/andin/`; the React frontend lives under `src/games/andin/`.
- Development: run `npm run game:dev` and `npm run dev` separately. `/andin-preview` is a development-only route for local test identities. It is excluded from production bundles. `--dev-auth` is restricted to localhost origins and forbidden with NODE_ENV=production.
- Normal Firebase authentication backend: `npm run game:server`. It loads `.env` and optionally `.env.andin.local`. Never commit credentials, tokens, or service-account files.
- Vite proxies `/api/andin` to localhost port 8787. Production frontend must set `VITE_ANDIN_WS_URL` to the deployed secure WebSocket endpoint ending in `/api/andin/ws`, or use a same-origin reverse proxy.
- Production backend needs NODE_ENV=production, ANDIN_ORIGINS containing exact allowed frontend origins, ANDIN_FIREBASE_PROJECT_ID, and Firebase Admin Application Default Credentials. Token verification checks revocation. PORT or ANDIN_PORT selects the listening port.
- Default ANDIN_STORAGE=file requires ANDIN_DATA_DIR pointing to a persistent volume in production. Only one process may own that directory. Graceful SIGTERM/SIGINT releases its lock. After an ungraceful crash, inspect the lock owner before manually removing a stale lock; never remove a lock belonging to a live server.
- Optional ANDIN_STORAGE=firestore requires ANDIN_FIRESTORE_DATABASE naming an isolated non-default database and Firebase Admin credentials. `server/andin/firestore.rules` denies all client access and is intended ONLY for that isolated game database. Never deploy it over the application's existing Firebase database rules. Remote rules and cloud credentials must be verified before deployment.
- Use a single backend instance initially. Firestore leases prevent two servers writing one room but do not provide multi-instance room routing. Public deployments need TLS/WSS, persistent storage, and appropriate WebSocket timeouts.
- Room access is separate from couple data. Do not store game state under `couples`, grant friends access to private couple collections, or trust client-provided money, crop growth, time, or coordinates.
