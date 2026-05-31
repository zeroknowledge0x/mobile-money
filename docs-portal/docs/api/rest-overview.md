---
sidebar_position: 1
title: REST API Overview
slug: /api/rest
---

# REST API Overview

The Mobile Money API exposes 40+ RESTful endpoints for managing transactions, accounts, and provider integrations.

## Base URL

```
Production: https://api.mobile-money.stellar.org
Staging: https://staging-api.mobile-money.stellar.org
Local: http://localhost:3000
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```bash
Authorization: Bearer <your-jwt-token>
```

See [JWT Authentication](/docs/security/jwt-authentication) for details.

## Response Format

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-05-31T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

## Full Reference

For the complete interactive API reference, see the [API Reference](/api) page.
