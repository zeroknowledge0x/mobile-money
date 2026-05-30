---
sidebar_position: 1
title: Docker Setup
description: Deploy Mobile Money services with Docker Compose
---

# Docker Setup

Deploy the Mobile Money API stack locally or in production using Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

```bash
# Clone and start
git clone https://github.com/sublime247/mobile-money.git
cd mobile-money/starter-node
cp .env.example .env
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `api` | 3000 | Main API server |
| `postgres` | 5432 | Database |
| `redis` | 6379 | Cache & queues |
| `worker` | — | Background job processor |

## Environment Variables

```env
DATABASE_URL=postgres://user:pass@postgres:5432/mobile_money
REDIS_URL=redis://redis:6379
API_KEY=sk_sandbox_abc123
WEBHOOK_SECRET=whsec_xyz789
```

## Health Check

```bash
curl http://localhost:3000/health
# {"status":"ok","version":"1.2.0"}
```

## Troubleshooting

- **Port conflicts**: Change ports in `docker-compose.yml`
- **Database connection**: Ensure postgres is healthy before API starts
- **Worker not processing**: Check redis connection and queue names
