# Deploy Laravel + Reverb on Sevalla with Nixpacks (single web process)

This template uses Nixpacks with Nginx + PHP‑FPM. Sevalla exposes a single web process, so Reverb (WebSockets) runs on an internal port and is proxied through Nginx on the same external port.

## What’s included

- `nixpacks.toml`
  - Installs PHP 8.4, Composer, Node (providers `php`, `node`)
  - Installs Composer deps (prod) and prepares Nginx logs
  - Serves the app from `/app/public` with a single page fallback to `/index.php`
- `nginx.template.conf`
  - Nixpacks‑templated Nginx config that listens on `$PORT` and forwards PHP to PHP‑FPM on `127.0.0.1:9000`

## 1) Create Sevalla resources

1. Create a database (MySQL or Postgres).
2. Create a Sevalla app and connect this repository.

## 2) Configure build (Nixpacks)

In your Sevalla app:
- Ensure **Build environment** is set to **Nixpacks** (root path `.`).
- Nixpacks will detect `nixpacks.toml` and use `nginx.template.conf`.

## 3) Enable Reverb over the single web port

We’ll proxy WebSocket traffic from Nginx to an internal Reverb server on `127.0.0.1:8081`:

Add this block inside the `server { ... }` of `nginx.template.conf` (above the `location ~ \.php$` block is fine):

```nginx
# Reverb WebSocket proxy (single web port)
location ^~ /app {
    proxy_pass http://127.0.0.1:8081;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60m;
    proxy_send_timeout 60m;
}
```

Note: `/app` is the default Pusher‑compatible path used by Reverb’s Echo client. If you change it, update both the Reverb server path and the client `wsPath`.

## 4) Environment variables

Set these in Sevalla → App → Environment variables:

- Core
  - `APP_ENV=production`
  - `APP_DEBUG=false`
  - `APP_KEY` (generate with `php artisan key:generate --show`)
  - `APP_URL=https://your-domain`
  - `BROADCAST_CONNECTION=reverb`
- Reverb app credentials (create with `php artisan reverb:install` if you don’t have them)
  - `REVERB_APP_ID=...`
  - `REVERB_APP_KEY=...`
  - `REVERB_APP_SECRET=...`
- Reverb client/broadcaster target (public endpoint)
  - `REVERB_HOST=your-domain`          # no protocol
  - `REVERB_PORT=443`
  - `REVERB_SCHEME=https`
- Reverb server (internal, proxied by Nginx)
  - `REVERB_SERVER_HOST=127.0.0.1`
  - `REVERB_SERVER_PORT=8081`
  - `REVERB_SERVER_PATH=/app`
- Vite/Echo (frontend)
  - `VITE_REVERB_APP_KEY=${REVERB_APP_KEY}`
  - `VITE_REVERB_HOST=your-domain`
  - `VITE_REVERB_SCHEME=https`

Optional:
- If you want Nginx to always route 404s to Laravel (SPA style), set `IS_LARAVEL=1`.
- Configure database variables from Sevalla’s “Connected services” if using a managed DB.

## 5) Single web process start command

Sevalla can only expose one web process. Start PHP‑FPM, Reverb, and Nginx in a single command:

- Option A — define in `nixpacks.toml`:

```toml
[start]
cmd = "sh -lc \"php-fpm -F & php artisan reverb:start --host=${REVERB_SERVER_HOST:-127.0.0.1} --port=${REVERB_SERVER_PORT:-8081} --no-interaction & nginx -g 'daemon off;'\""
```

- Option B — set in Sevalla UI:
  - App → Processes → Web → Start command:

```bash
sh -lc "php-fpm -F & php artisan reverb:start --host=${REVERB_SERVER_HOST:-127.0.0.1} --port=${REVERB_SERVER_PORT:-8081} --no-interaction & nginx -g 'daemon off;'"
```

Nginx will listen on `$PORT` (provided by Sevalla), serve Laravel from `/app/public`, forward `.php` to PHP‑FPM on `127.0.0.1:9000`, and proxy WebSockets at `/app` to Reverb on `127.0.0.1:8081`.

## 6) Migrations and optional workers

- Release job (after each deploy): `php artisan migrate --force`
- Optional workers (create separate background processes as needed):
  - Scheduler: `php artisan schedule:work`
  - Queue: `php artisan queue:work`

## 7) Verify

- Load the app over HTTPS and confirm pages render.
- Open the browser devtools Network tab and verify a `ws`/`wss` connection to `/app` upgrades (101 Switching Protocols).
- Trigger a broadcast event and confirm it reaches connected clients.

## Custom PHP settings via `.user.ini`

Create a `.user.ini` in the project root to adjust PHP limits:

```ini
upload_max_filesize = 50M
post_max_size = 50M
```

Commit and redeploy for changes to take effect.
