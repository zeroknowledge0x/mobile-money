---
sidebar_position: 2
title: Authentication
description: Learn how to authenticate API requests
---

# Authentication

All API requests require a Bearer token in the `Authorization` header.

## API Key Types

| Key Type | Environment | Rate Limit |
|----------|-------------|------------|
| Sandbox  | `sandbox.mobile-money.api` | 100 req/min |
| Live     | `api.mobile-money.api` | 1000 req/min |

## Using Your API Key

Include the key in every request:

```bash
curl -H "Authorization: Bearer sk_live_abc123" \
  https://api.mobile-money.api/v1/balance
```

## Key Rotation

Rotate your API keys every 90 days. Both old and new keys remain active for a 24-hour grace period during rotation.

## Error Responses

| Status | Meaning |
|--------|---------|
| `401`  | Missing or invalid API key |
| `403`  | Key doesn't have permission for this endpoint |
| `429`  | Rate limit exceeded — retry after cooldown |
