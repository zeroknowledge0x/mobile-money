---
sidebar_position: 3
title: Docker Development
slug: /getting-started/docker-dev
---

# Docker Compose — Local Development

:::info
See the full [Docker Dev Guide](https://github.com/sublime247/mobile-money/blob/main/docs/DOCKER_DEV.md) in the repository.
:::

## Quick Start

```bash
# Clone the repository
git clone https://github.com/sublime247/mobile-money.git
cd mobile-money

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Run database migrations
npm run db:migrate

# Start the development server
npm run dev
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| API Server | 3000 | Main REST + GraphQL API |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache + queue broker |
| BullMQ Dashboard | 3001 | Queue admin UI |
| Mock Provider | 3002 | Mobile money provider mock |
