---
sidebar_position: 2
title: Architecture
slug: /getting-started/architecture
---

# Architecture Overview

:::info
This is a summary. See the full [Architecture Documentation](https://github.com/sublime247/mobile-money/blob/main/docs/ARCHITECTURE.md) in the repository.
:::

## System Components

The platform consists of several key components:

### Core Services
- **API Gateway** — REST + GraphQL endpoints with rate limiting and auth
- **Transaction Engine** — Processes deposits, withdrawals, and transfers
- **Provider Adapters** — MTN MoMo, Airtel Money, Orange Money integrations
- **Stellar Bridge** — Handles blockchain transactions and settlements

### Infrastructure
- **PostgreSQL** — Primary database with read replicas
- **Redis** — Caching, queues (BullMQ), and pub/sub
- **WebSocket Server** — Real-time transaction updates
- **BullMQ Workers** — Async job processing

### Monitoring
- **Prometheus + Grafana** — Metrics and dashboards
- **ELK Stack** — Centralized logging
- **PagerDuty** — Alerting and incident management
