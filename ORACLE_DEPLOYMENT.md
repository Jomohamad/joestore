## Oracle Cloud (Free VPS) Deployment

1. Install Docker and Docker Compose on the VPS.
2. Copy project files to server.
3. Create `.env` from `.env.example` and fill all values.
4. Start services:

```bash
docker compose up -d --build
```

5. Check health:

```bash
curl http://localhost:3000/api/health
```

6. Open ports `80/443/3000` in Oracle security list and instance firewall.
7. Put Nginx/Caddy in front for TLS and reverse-proxy to `localhost:3000`.
